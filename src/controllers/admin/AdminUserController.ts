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
    let users;

    if (!page) {
      users = await getRepository(User).find({
        where: {
          role: role ? role : In(Object.values(roles)) as any
        },
        relations: {
          services: true,
        }
      });
      return res.status(200).send({ code: 200, data: users });
    }

    const baseWhere = [
      { name: Like(`%${query}%`) },
      { lastName: Like(`%${query}%`) },
      { phoneNumber: Like(`%${query}%`) },
    ];

    const relationsObj = {
      jobs: true
    };

    if (Array.isArray(relations)) {
      await Promise.all(relations.map(async e => {
        if (await getRepository(User).metadata.relations.find(relation => relation.propertyName == e)) {
          relationsObj[e] = true;
        }
      }));
    }

    const options: FindManyOptions = {
      relations: {
        services: true,
        jobs: true,
        ...relationsObj
      },
      take: Number(perPage),
      skip: Number(perPage) * (Number(page) - 1 || 0),
      order: {
        id: 'ASC',
      },
      where: role ? baseWhere.map(condition => ({ ...condition, role })) : baseWhere
    };

    if (role) {
      options.where['role'] = role;
    }

    if (phoneNumber) {
      options.where['phoneNumber'] = Like(`%${phoneNumber}%`);
    }
    try {
      const [users, count] = await getRepository(User).findAndCount(options);

      const allUsers = await getRepository(User).find();

      const rolesCount = Object.entries(roles).reduce((acc, [role, roleTitle]) => ({
        ...acc,
        [role]: {
          count: allUsers.filter(e => e.role === role).length,
          title: roleTitle
        }
      }), {
        all: {
          count: allUsers.length,
          title: 'All'
        }
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

    let user = undefined;
    const isEdit = id != null || id == ''

    if (id) {
      try {
        user = await getRepository(User).findOneOrFail({ where: { id: Number(id) } });
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

    if (role == roles.SUPER_ADMIN || role == roles.OPERATOR || role == roles.WORKER && password && username) {
      user.username = username;
      user.password = password;
      await user.hashPassword();
    }


    if (role == roles.WORKER){
      if (services){
        let allServices = services;
          for (const serviceId of services) {
            const serviceChildren = await getTreeRepository(Service).findDescendants(await getRepository(Service).findOneBy({ id: serviceId }), { depth: 5 });
            allServices = [...allServices, ...serviceChildren.map(e => e.id)];
          }
        user.services = await getRepository(Service).findBy({ id: In(allServices) });
      }
      if (districts){
        user.districts = await getRepository(District).findBy({ id: In(districts)})
      }
      user.isVerified = true
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
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: Number(id) },
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid UserId'
      });
      return;
    }
    try {
      await this.users().delete(user.id);
    } catch (e) {
      res.status(409).send('error try again later');
    }
    return res.status(200).send({
      code: 204,
      data: 'Success'
    });
  };

  static medias = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let user;

    try {
      user = await this.users().findOneOrFail({ where: { id: Number(id) } });
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
    let user: User = null;
    try {
      user = await this.users().findOneOrFail({
        where: { id: Number(id) },
        relationLoadStrategy: 'query',
        relations: {
          services: true,
          workerOffs: { order: true },
          profilePic: true,
          districts: true,
          transactions: { media: true },
          jobs: { feedback: true }
        }
      });
    } catch (error) {
      res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
      return;
    }
    return res.status(200).send({
      code: 200,
      data: user
    });
  };
  static active = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { status } = req.body;
    let user = null;
    try {
      user = await this.users().update(
        { id: Number(id) },
        { status: status }
      );
    } catch (error) {
      res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      });
      return;
    }
    return res.status(200).send({
      code: 200,
      data: user
    });
  };
  static verifyUser = async (req: Request, res: Response): Promise<Response> => {
    const { nationalCode, phoneNumber} = req.body;
    const res2 = await axios.post('https://ehraz.io/api/v1/match/national-with-mobile', {
      nationalCode: nationalCode,
      mobileNumber: phoneNumber
    }, {
      headers: {
        Authorization: 'Token 51ee79f712dd7b0e9e19cb4f35a972ade6f3f42f',
        'Content-type': 'application/json'
      }
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
  }

  static textMessage = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { text } = req.body
    let user: User;
    try {
      user = await this.users().findOneOrFail({
        where: {
          id: Number(id)
        },
      });
    } catch (error) {
      res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
      return;
    }
    sms.send(text, user.phoneNumber)
    return res.status(200).send({
      code: 200,
      data: { user, text }
    });
  }

  static findBy = async (req: Request, res: Response): Promise<Response> => {
    let user: User;
    try {
      user = await this.users().findOneOrFail({
        where: req.query,
        relations: {
          addresses: true
        }
      });
    } catch (error) {
      res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
      return;
    }

    return res.status(200).send({
      code: 200,
      data: user
    });
  }
  static workerOff = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
      date,
      fromTime,
      toTime
    } = req.body;
    let user = null;
    try {
      user = await getRepository(WorkerOffs).insert(
        {
          userId: Number(id),
          date: date,
          fromTime: Number(fromTime),
          toTime: Number(toTime)
        }
      );
    } catch (error) {
      res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      });
      return;
    }
    return res.status(200).send({
      code: 200,
      data: user
    });
  };
  static deleteWorkerOff = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    try {
      await getRepository(WorkerOffs).delete(
        {
          id: Number(id)
        }
      );
    } catch (error) {
      res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      });
      return;
    }
    return res.status(200).send({
      code: 200,
      data: 'Successful'
    });
  };
  static excelExport = async (req: Request, res: Response): Promise<Response> => {
    const { type } = req.body;

    const where: FindOptionsWhere<User> = {}
    if (type != 'all'){
      where.role = type
    }

    where.name = Not(IsNull())

    const users = await getRepository(User).find({ where: where });

    const schema = [
      {
        column: 'PhoneNumber',
        type: String,
        value: user => user.phoneNumber?.toString()
      }, 
      {
        column: 'Name',
        type: String,
        value: user => user.name?.toString()
      },
      {
        column: 'Last Name',
        type: String,
        value: user => user.lastName?.toString()
      },
    ]
    const time = moment().unix();
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'excel', 'user', time + '.xlsx')
    await fsPromisses.writeFile(filePath , '');
    await writeXlsxFile(users, {
      schema,
      filePath: filePath,
    })
    console.log(req.protocol);
    return res.status(200).send({
      code: 200,
      data: { link: 'https://' + req.get('host') + '/public/uploads/excel/user/' + time + '.xlsx'}
    });
  }
}

export default AdminUserController;
