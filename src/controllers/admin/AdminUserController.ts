import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { getRepository, In, Like } from 'typeorm';
import { Address } from '../../entity/Address';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { dataTypes, roles } from '../../utils/enums';
import { generateCode } from '../../utils/funs';
import media from '../../utils/media';

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

    const relationsObj = {};
    const where = {};

    if (role) {
      where['role'] = { slug: role };
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

    users = await this.users().find({
      where: where,
      relations: relationsObj
    });
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
      serviceId,
      password,
      role,
      status,
      username
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
      user.code = generateCode(8, dataTypes.string);
    }

    user.name = name;
    user.lastName = lastName;
    user.nationalCode = nationalCode;
    user.phoneNumber = phoneNumber;
    user.percent = percent;
    if (role == roles.WORKER && serviceId) {
      user.serviceId = serviceId;
    }
      user.status = status;

    if (role == roles.SUPER_ADMIN || role == roles.OPERATOR && password && username) {
      user.username = username;
      user.password = password;
      await user.hashPassword();
    }

    user.role = role;

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

  // static address = async (req: Request, res: Response): Promise<Response> => {
  //   const { id } = req.params
  //   const {
  //     title,
  //     userId,
  //     cityId,
  //     provinceId,
  //     postalCode,
  //     pelak,
  //     phoneNumber,
  //     description
  //   } = req.body;
  //   let user: User;
  //   try {
  //     user = await this.users().findOneOrFail({ where: { id: Number(id) } });
  //   } catch (e) {
  //     return res.status(400).send({
  //       'code': 400,
  //       'data': 'Invalid UserId'
  //     });
  //   }
  //   let address: Address;
  //   try {
  //     address = await this.addresses().findOneOrFail(id);
  //   } catch (error) {
  //     return res.status(400).send({code: 400, data:"Invalid Id"});
  //   }
  //   if (title)
  //     address.title = title;
  //   if (description)
  //       // address.description = description;
  //     if (longitude)
  //       address.longitude = longitude;
  //   if (latitude)
  //     address.latitude = latitude;
  //   if (phoneNumber)
  //     address.phoneNumber = phoneNumber;
  //   const errors = await validate(address);
  //   if (errors.length > 0) {
  //     return res.status(400).send(errors);
  //   }
  //   try {
  //     await addressRepository.save(address);
  //   } catch (e) {
  //     return res.status(409).send("error try again later");
  //   }
  //   return res.status(200).send({code: 400, data: address});
  // };

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
      user.mediaId = await media.create(req, (req as any).files[0], user.title, '/public/uploads/brands/');
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

}

export default AdminUserController;
