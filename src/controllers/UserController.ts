import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import jwtD from 'jwt-decode';
import { getRepository } from 'typeorm';
import config from '../config/config';
import { Discount } from '../entity/Discount';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, roles } from '../utils/enums';
import { generateCode, jwtDecode, signJWT } from '../utils/funs';
import sms from '../utils/smsLookup';

class UserController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(WorkerOffs);

  static getUser = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
        relations: { media: true }
      });
    } catch (e) {
      return res.status(400).send({
        'code': 400,
        'data': 'Invalid User'
      });
    }
    return res.status(200).send({
      'code': 200,
      'data': user
    });
  };
  static changePassword = async (req: Request, res: Response): Promise<Response> => {
    // Get ID from JWT
    const id = jwtDecode(req.headers.authorization);
    // Get parameters from the body
    const {
      oldPassword,
      newPassword
    } = req.body;
    if (!(oldPassword && newPassword)) {
      res.status(400).send();
    }

    // Get user from the database
    const userRepository = getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail({
        where: { id: id },
      });
    } catch (error) {
      res.status(401).send();
    }

    // Check if old password matchs
    // if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
    //   res.status(401).send("Invalid password or wrong email!");
    //   return;
    // }

    // Validate de model (password lenght)
    user.password = newPassword;
    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    // Hash the new password and save
    // user.hashPassword();
    await userRepository.save(user);

    return res.status(204).send();
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization)

    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
      });
    } catch (e) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
    }

    const {
      name,
      lastName,
      nationalCode,
      phoneNumber,
      birthday
    } = req.body;

    if (!name) {
      return res.status(400).send({
        code: 1002,
        data: 'Invalid name'
      });
    }

    if (!user.nationalCode && !nationalCode) {
      return res.status(400).send({
        code: 1003,
        data: 'Invalid National Code'
      });
    }
    if (!user.isVerified) {
      const res2 = await axios.post('https://ehraz.io/api/v1/match/national-with-mobile', {
        nationalCode: nationalCode,
        mobileNumber: user.phoneNumber
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
      console.log(birthday);
      // const res3 = await axios.post('https://ehraz.io/api/v1/info/identity-similarity', {
      //   nationalCode: nationalCode,
      //   birthDate: '1378/02/02',
      //   firstName: name,
      //   lastName: lastName,
      //   fatherName: 'بابک',
      //   fullName: name + ' ' + lastName
      // }, {
      //   headers: {
      //     Authorization: 'Token 51ee79f712dd7b0e9e19cb4f35a972ade6f3f42f',
      //     'Content-type': 'application/json'
      //   }
      // });
      // console.log(res3.data);
      // if (!res3.data?.matched) {
      //   return res.status(400).send({
      //     code: 1006,
      //     data: res3.data
      //   });
      // }
    }
    sms.referral(user.name + ' ' + user.lastName, user.code, user.phoneNumber);
    try {
      await getRepository(Discount).insert({
        userId: user.id,
        title: 'welcome',
        percent: 10,
        code: user.code,
        active: true,
        maxCount: 10,
      });
    } catch (e) {
      console.log(e);
      return res.status(409).send({ 'code': 409 });
    }

    user.name = name;
    user.lastName = lastName;
    user.nationalCode = nationalCode;
    user.phoneNumber = phoneNumber;
    user.birthday = birthday;
    user.isVerified = true;

    try {
      await this.users().save(user);

    } catch (e) {
      return res.status(409).send({ 'code': 409 });

    }


    return res.status(200).send({
      code: 200,
      user: user,
      token: await signJWT(user)
    });
  };
  static getAddresses = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    const userRepository = getRepository(User);
    let user;
    try {
      user = await userRepository.findOneOrFail({
        where: { id: id },
        relations: ['addresses']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid UserId'
      });
      return;
    }
    return res.status(200).send({
      code: '200',
      data: user.addresses
    });
  };

  static getWorkerOffs = async (req: Request, res: Response): Promise<Response> => {
    const {
      workerId,
      date
    } = req.query;
    let workerOff;
    if (!date) {
      return res;
    }
    if (workerId) {
      try {
        workerOff = await this.workerOffs().find({
          where: {
            userId: Number(workerId),
            date: date as string
          }
        });
      } catch (e) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid WorkerId'
        });
      }
    } else {
      try {
        workerOff = await this.workerOffs().find({
          where: {
            date: date as string
          }
        });

      } catch (e) {
        console.log(e);
        return res.status(400).send({
          code: 400,
          data: 'Unexpected Error'
        });
      }
    }
    return res.status(200).send({
      code: 200,
      data: workerOff
    });
  };

}

export default UserController;
