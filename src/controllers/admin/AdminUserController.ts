import axios from 'axios';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import fsPromisses from 'fs/promises';
import moment from 'jalali-moment';
import path from 'path';
import { FindManyOptions, FindOptionsWhere, getRepository, getTreeRepository, In, IsNull, Like, Not } from 'typeorm';
import writeXlsxFile from 'write-excel-file/node';
import { Address } from '../../entity/Address';
import { District } from '../../entity/District';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { dataTypes, roles } from '../../utils/enums';
import { generateCode, jwtDecode } from '../../utils/funs';
import media from '../../utils/media';
import sms from '../../utils/sms';

class AdminUserController {
  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static services = () => getRepository(Service);
  static addresses = () => getRepository(Address);

  static index = async (req: Request, res: Response): Promise<Response> => {
    const {
      role,
      type,
      phoneNumber,
      perPage = 25,
      relations,
      query,
      page
    } = req.query;
    let users
    // If no pagination, return minimal data with only essential relations
    if (!page) {
      users = await getRepository(User).find({
        where: {
          role: role ? role as any : In(Object.values(roles)) as any
        },
        relations: {
          services: true,
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          status: true,
        }, order: {
          status: 'DESC'
        }
      });
      return res.status(200).send({ code: 200, data: users });
    }

    const baseWhere = [
      { name: Like(`%${query}%`) },
      { lastName: Like(`%${query}%`) },
      { phoneNumber: Like(`%${query}%`) },
    ];

    const relationsObj: any = {};

    // Only load jobs count, not full relations for list view
    if (Array.isArray(relations)) {
      relations.forEach(relationName => {
        const relation = getRepository(User).metadata.relations.find(r => r.propertyName === relationName);
        if (relation) {
          relationsObj[relationName] = true;
        }
      });
    }

    const options: FindManyOptions = {
      relations: {
        services: true,
        ...relationsObj
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        status: true,
        nationalCode: true,
        isVerified: true,
        walletBalance: true,
        createdAt: true,
        lastEntrance: true,
        tmpCode: true,
      },
      take: Number(perPage),
      skip: Number(perPage) * (Number(page) - 1 || 0),
      order: {
        status: 'DESC',
        id: 'ASC'
      },
      where: role ? baseWhere.map(condition => ({ ...condition, role })) : baseWhere
    };

    if (phoneNumber) {
      options.where = { phoneNumber: Like(`%${phoneNumber}%`) };
    }

    try {
      // Use parallel queries for better performance
      const [usersResult, rolesCountResult] = await Promise.all([
        getRepository(User).findAndCount(options),
        // Use aggregation for role counts instead of loading all users
        getRepository(User)
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany()
      ]);

      const [users, count] = usersResult;

      // Transform role counts into the expected format
      const rolesCount = rolesCountResult.reduce((acc, item) => {
        acc[item.role] = {
          count: parseInt(item.count),
          title: roles[item.role] || item.role
        };
        return acc;
      });

      return res.status(200).send({
        code: 200,
        data: {
          users,
          count,
          rolesCount,
        }
      });
    } catch (e) {
      console.log(e);
      return res.status(501).send({
        code: 501,
        data: 'Unknown Error'
      });
    }
  };

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const {
      name,
      lastName,
      nationalCode,
      phoneNumber,
      percent,
      services,
      password,
      role,
      status,
      username,
      cardNumber,
      shebaNumber,
      hesabNumber,
      bankName,
      walletBalance,
      districts,
      isVerified,
      isWorkerChoosable
    } = req.body;

    const { id } = req.params;

    let user: User;

    if (id) {
      try {
        user = await getRepository(User).findOneOrFail({
          where: { id: Number(id) },
          select: {
            id: true,
            name: true,
            lastName: true,
            phoneNumber: true,
            role: true,
            status: true,
            nationalCode: true,
            username: true,
            code: true,
            percent: true,
            isVerified: true,
            isWorkerChoosable: true,
            walletBalance: true,
            shebaNumber: true,
            bankName: true,
            hesabNumber: true,
            cardNumber: true
          }
        });
      } catch (e) {
        console.log(e);
        return res.status(400).send({
          code: 400,
          data: 'Invalid User Id'
        });
      }
    } else {
      user = new User();
      if(nationalCode && phoneNumber){
        user.username = phoneNumber;
        user.password = nationalCode;
        await user.hashPassword();
      }
      user.code = generateCode(8, dataTypes.string);
    }

    user.name = name;
    user.lastName = lastName;
    user.nationalCode = nationalCode;
    user.phoneNumber = phoneNumber;
    user.percent = percent;
    user.isWorkerChoosable = isWorkerChoosable;
    user.status = status;
    user.walletBalance = walletBalance != '' ? walletBalance : 0;

    if (isVerified) {
      user.isVerified = isVerified;
    }
    user.role = role || roles.USER;

    if ((role == roles.SUPER_ADMIN || role == roles.OPERATOR || role == roles.WORKER) && password && username) {
      user.username = username;
      user.password = password;
      await user.hashPassword();
    }

    if (role == roles.WORKER){
      if (services){
        // Optimize: Use Set to avoid duplicates and reduce DB queries
        const allServiceIds = new Set<number>(services);

        // Batch load all service descendants
        const serviceDescendants = await Promise.all(
          services.map(async (serviceId: number) => {
            const service = await getRepository(Service).findOneBy({ id: serviceId });
            if (!service) return [];
            const descendants = await getTreeRepository(Service).findDescendants(service, { depth: 5 });
            return descendants.map(s => s.id);
          })
        );

        // Flatten and add to Set
        serviceDescendants.flat().forEach(id => allServiceIds.add(id));

        user.services = await getRepository(Service).findBy({
          id: In(Array.from(allServiceIds))
        });
      }

      if (districts){
        user.districts = await getRepository(District).findBy({ id: In(districts) });
      }

      user.isVerified = true;
      user.shebaNumber = shebaNumber;
      user.bankName = bankName;
      user.hesabNumber = hesabNumber;
      user.cardNumber = cardNumber;
    }

    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }

    try {
      await this.users().save(user);
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
    }

    return res.status(201).send({
      code: 200,
      data: user
    });
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      const result = await this.users().delete({ id: Number(id) });

      if (result.affected === 0) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid UserId'
        });
      }
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
    }

    return res.status(200).send({
      code: 200,
      data: 'Success'
    });
  };

  static medias = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let user;

    try {
      user = await this.users().findOneOrFail({
        where: { id: Number(id) },
        select: ['id', 'name', 'lastName', 'profileId']
      });
    } catch (error) {
      return res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
    }

    if ((req as any).files[0]) {
      user.profileId = await media.create(req, (req as any).files[0], user.name + '-' + user.lastName, '/public/uploads/profilePic/');
    }

    try {
      await this.users().save(user);
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
    }

    return res.status(201).send({
      code: 200,
      data: user
    });
  };

  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      // Use query builder for better control over loaded data
      const user = await this.users()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.services', 'services')
      .leftJoinAndSelect('user.profilePic', 'profilePic')
      .leftJoinAndSelect('user.districts', 'districts')
      .leftJoinAndSelect('user.transactions', 'transactions')
      .leftJoinAndSelect('transactions.media', 'transactionMedia')
      .leftJoinAndSelect('user.workerOffs', 'workerOffs', 'workerOffs.date >= :date', {
        date: moment().subtract(1, 'day').format('jYYYY/jMM/jDD')
      })
      .leftJoinAndSelect('workerOffs.order', 'order')
      .loadRelationCountAndMap('user.jobsCount', 'user.jobs')
      .loadRelationCountAndMap('user.ordersCount', 'user.orders')
      .where('user.id = :id', { id: Number(id) })
      .getOne();

      if (!user) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid Id'
        });
      }

      // Load jobs separately with pagination/limit to avoid loading too much data
      const jobs = await getRepository(Order).find({
        where: { workerId: Number(id) },
        relations: { feedback: true, service: true },

        order: { createdAt: 'DESC' },
        take: 100 // Limit to recent 50 jobs
      });

      return res.status(200).send({
        code: 200,
        data: {
          ...user,
          jobs
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Id'
      });
    }
  };

  static active = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const result = await this.users().update(
        { id: Number(id) },
        { status: status }
      );

      if (result.affected === 0) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid UserId'
        });
      }

      return res.status(200).send({
        code: 200,
        data: 'Success'
      });
    } catch (error) {
      console.log(error);
      return res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      });
    }
  };

  static verifyUser = async (req: Request, res: Response): Promise<Response> => {
    const { nationalCode, phoneNumber } = req.body;

    try {
      const res2 = await axios.post('https://ehraz.io/api/v1/match/national-with-mobile', {
        nationalCode: nationalCode,
        mobileNumber: phoneNumber
      }, {
        headers: {
          Authorization: 'Token 51ee79f712dd7b0e9e19cb4f35a972ade6f3f42f',
          'Content-type': 'application/json'
        },
        timeout: 10000 // Add timeout
      });

      if (!res2.data?.matched) {
        return res.status(400).send({
          code: 1005,
          data: 'کد ملی با شماره تلفن تطابق ندارد'
        });
      }

      return res.status(200).send({
        code: 200,
        data: 'Successful'
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        code: 500,
        data: 'Verification service error'
      });
    }
  };

  static textMessage = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { text } = req.body;

    try {
      const user = await this.users().findOneOrFail({
        where: { id: Number(id) },
        select: ['id', 'name', 'lastName', 'phoneNumber']
      });

      sms.send(text, user.phoneNumber);

      return res.status(200).send({
        code: 200,
        data: { user, text }
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Id'
      });
    }
  };

  static findBy = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await this.users().findOneOrFail({
        where: req.query as any,
        relations: {
          addresses: { district: true }
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          phoneNumber: true,
          nationalCode: true,
          role: true,
          status: true,
        }
      });

      return res.status(200).send({
        code: 200,
        data: user
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'User not found'
      });
    }
  };

  static workerOff = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { date, fromTime, toTime } = req.body;

    try {
      const result = await getRepository(WorkerOffs).insert({
        userId: Number(id),
        date: date,
        fromTime: Number(fromTime),
        toTime: Number(toTime)
      });

      return res.status(200).send({
        code: 200,
        data: result
      });
    } catch (error) {
      console.log(error);
      return res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      });
    }
  };

  static deleteWorkerOff = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      const result = await getRepository(WorkerOffs).delete({ id: Number(id) });

      if (result.affected === 0) {
        return res.status(400).send({
          code: 400,
          data: 'WorkerOff not found'
        });
      }

      return res.status(200).send({
        code: 200,
        data: 'Successful'
      });
    } catch (error) {
      console.log(error);
      return res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      });
    }
  };

  static excelExport = async (req: Request, res: Response): Promise<Response> => {
    const { type } = req.body;

    const where: FindOptionsWhere<User> = {};
    if (type != 'all') {
      where.role = type as any;
    }

    // Only select necessary fields for export
    const users = await getRepository(User).find({
      where: where,
      select: ['phoneNumber', 'name', 'lastName']
    });

    const schema = [
      {
        column: 'PhoneNumber',
        type: String,
        value: (user: User) => user.phoneNumber?.toString().substring(1) || ''
      },
      {
        column: 'Name',
        type: String,
        value: (user: User) => user.name?.toString() || ''
      },
      {
        column: 'Last Name',
        type: String,
        value: (user: User) => user.lastName?.toString() || ''
      },
    ];

    const time = moment().unix();
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'excel', 'user', time + '.xlsx');

    try {
      await writeXlsxFile(users, {
        schema,
        filePath: filePath,
      });

      return res.status(200).send({
        code: 200,
        data: { link: 'https://' + req.get('host') + '/public/uploads/excel/user/' + time + '.xlsx' }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        code: 500,
        data: 'Error generating Excel file'
      });
    }
  };
}

export default AdminUserController;