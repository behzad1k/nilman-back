import axios from 'axios';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { getRepository, getTreeRepository, In, Like } from 'typeorm';
import { Address } from '../../entity/Address';
import { District } from '../../entity/District';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { dataTypes, orderStatus, roles } from '../../utils/enums';
import { generateCode, jwtDecode } from '../../utils/funs';
import media from '../../utils/media';
import smsLookup from '../../utils/smsLookup';

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
      relations
    } = req.query;
    let users, productObj;

    const relationsObj = {
      jobs: true
    };
    const where = {};

    if (role) {
      where['role'] = role;
    }
    if (Array.isArray(relations)) {
      await Promise.all(relations.map(async e => {
        if (await getRepository(User).metadata.relations.find(relation => relation.propertyName == e)) {
          relationsObj[e] = true;
        }
      }));
    }

    if (phoneNumber) {
      where['phoneNumber'] = Like(`%${phoneNumber}%`);
    }
    relationsObj['services'] = true;
    users = await this.users().find({
      where: where,
      relations: relationsObj
    });

    for (const user of users) {
      if (user.role == roles.WORKER){
        user.walletBalance = user.jobs.filter(e => e.transactionId == null && e.status == orderStatus.Done).reduce((acc, curr) => acc + (curr.price * curr.workerPercent / 100) + curr.transportation, 0)
        console.log(user.lastName, user.walletBalance);
        await getRepository(User).save(user)
      }
    }
    return res.status(200).send({
      'code': 200,
      'data': users
    });
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
      isVerified
    } = req.body;

    const { id } = req.params;

    let user = undefined;
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
    user.status = status;
    user.walletBalance = walletBalance;

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
        let allServices = [];
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
    let user = null;
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
          jobs: true
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

}

export default AdminUserController;
