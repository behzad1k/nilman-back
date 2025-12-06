import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwtD from 'jwt-decode';
import * as jwt from 'jsonwebtoken';
import { getRepository, In } from 'typeorm';
import config from '../config/config';
import { Discount } from '../entity/Discount';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, roles } from '../utils/enums';
import { generateCode, jwtDecode, signJWT, signTmpJWT } from '../utils/funs';
import sms from '../utils/sms';

class LoginController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(WorkerOffs);

  // Authentication
  static login = async (req: Request, res: Response): Promise<Response> => {
    const { phoneNumber } = req.body;
    if (!(phoneNumber)) {
      return res.status(400).send({ 'message': 'Phone number not set' });
    }
    const code = generateCode();
    let token = '';
    let user: User;
    user = await this.users().findOne({ where: { phoneNumber } });
    if (user) {
      if (user.role != roles.USER){
        return res.status(401).send({
          code: 401,
          data: "Invalid Login"
        })
      }
      if (user.status != 1){
        return res.status(401).send({
          code: 1005,
          data: "Inactive Login"
        })
        
      }
    }else{
      user = new User();
      user.phoneNumber = phoneNumber;
      user.role = roles.USER;
      user.password = '12345678';
      user.code = generateCode(8, dataTypes.string);
      // user.password = user.generatePassword();
      await user.hashPassword();
      user = await this.users().save(user);
    }
    user.tmpCode = code;
    user = await this.users().save(user);

    token = await signTmpJWT({
      id: user.id,
      code: code
    }, '2m');
    console.log(code);
    if (!user.isBlockSMS){
      sms.welcome(code, phoneNumber);
    }
    return res.status(200).send({
      token: token
    });
  };
  static loginWorker = async (req: Request, res: Response): Promise<Response> => {
    const { username, password } = req.body;
    if (!(username && password)) {
      return res.status(400).send({ 'message': 'Phone number not set' });
    }
    let user: User;
    user = await this.users().findOne({ where: { username: username } });
    if (!user || user.role != roles.WORKER) {
      return res.status(401).send({
        code: 401,
        data: "Invalid Login"
      })
    }
    if (user.status != 1){
      return res.status(401).send({
        code: 1005,
        data: "Inactive Login"
      })
    }
    if (!bcrypt.compareSync(password, user?.password)) {
      return res.status(401).send({
        code: 400,
        data: 'Invalid Credentials'
      });
    }
    user.lastEntrance = new Date();
    user = await this.users().save(user);

    const token = await signJWT(user, '30d');

    return res.status(200).send({
      code: 200,
      data: {
        token: token,
        user: user
      }
    });
  };
  static loginAdmin = async (req: Request, res: Response): Promise<Response> => {
    const {
      username,
      password
    } = req.body;
    if (!(username && password)) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid input'
      });
    }
    let user: User;
    try {
      user = await this.users().findOneOrFail({
        where: {
          username: username,
          role: In([roles.SUPER_ADMIN, roles.OPERATOR])
        }
      });
    } catch (e) {
      return res.status(401).send({
        code: 400,
        data: 'Invalid Credentials'
      });
    }
    if (user.status != 1){
      return res.status(401).send({
        code: 1005,
        data: "Inactive Login"
      })
    }
    if (!bcrypt.compareSync(password, user?.password)) {
      return res.status(401).send({
        code: 400,
        data: 'Invalid Credentials'
      });
    }
    const token = await signJWT(user);
    return res.status(200).send({
      code: 200,
      data: token
    });
  };
  // TODO: auth check doesnt check the token

  static authCheck = async (req: Request, res: Response): Promise<Response> => {
    const {
      token,
      code
    } = req.body;
    const tokens: any = jwtD(token);
    const userId = tokens.userId;
    const sysCode = tokens.code;
    const userRepository = getRepository(User);
    try{
      jwt.verify(token, config.jwtSecret)
    }catch (e){
      return res.status(401).send({
        code: 1000,
        'message': 'Token Expired'
      });
    }
    let user: User;
    try {
      user = await userRepository.findOneOrFail({ where: { id: Number(userId) } });
    } catch (e) {
      return res.status(401).send({
        code: 1000,
        'message': 'User not found'
      });
    }
    if (sysCode !== code) {
      return res.status(401).send({
        code: 1001,
        'message': 'Code does not match'
      });
    }
    const newToken = user.isVerified ? await signJWT(user) : null;

    try {
      await getRepository(User).update({ id: userId }, { lastEntrance: new Date() });
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        'message': 'Bad Request'
      });
    }
    return res.status(200).send({
      code: 200,
      data: {
        user: user,
        token: newToken
      }
    });
  };
  static authCheckWorker = async (req: Request, res: Response): Promise<Response> => {
    const {
      token,
      code
    } = req.body;
    const tokens: any = jwtD(token);
    const userId = tokens.userId;
    const sysCode = tokens.code;
    const userRepository = getRepository(User);
    try{
      jwt.verify(token, config.jwtSecret)
    }catch (e){
      return res.status(401).send({
        code: 1003,
        'message': 'Token Expired'
      });
    }
    let user: User;
    try {
      user = await userRepository.findOneOrFail({ where: { id: Number(userId) } });
    } catch (e) {
      return res.status(401).send({
        code: 1000,
        'message': 'Invalid Login'
      });
    }
    if (sysCode !== code) {
      return res.status(401).send({
        code: 1001,
        'message': 'Code does not match'
      });
    }
    const newToken = await signJWT(user);

    try {
      await getRepository(User).update({ id: userId }, { lastEntrance: new Date() });
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        'message': 'Bad Request'
      });
    }
    return res.status(200).send({
      code: 200,
      data: {
        user: user,
        token: newToken
      }
    });
  };

  static verifyUser = async (req: Request, res: Response): Promise<Response> => {
    const {
      name,
      lastName,
      nationalCode,
      phoneNumber,
      birthday,
      token
    } = req.body;
    const id = jwtDecode(token)

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
      try {

        const res2 = await axios.post('https://service.zohal.io/api/v0/services/inquiry/shahkar', {
          national_code: nationalCode,
          mobile: user.phoneNumber
        }, {
          headers: {
            Authorization: 'Bearer a44b70323d6f54bda1a2a49900fdede2b7f92a92',
            'Content-type': 'application/json'
          }
        });
      }catch (e) {
        console.log(e.response.data);
        return res.status(400).send({
          code: 1005,
          data: 'کد ملی با شماره تلفن تطابق ندارد'
        });
      }
    }
    // ehraz.io
    // const res2 = await axios.post('https://ehraz.io/api/v1/match/national-with-mobile', {
    //   nationalCode: nationalCode,
    //   mobileNumber: user.phoneNumber
    // }, {
    //   headers: {
    //     Authorization: 'Token 51ee79f712dd7b0e9e19cb4f35a972ade6f3f42f',
    //     'Content-type': 'application/json'
    //   }
    // });
    //
    // if (!res2.data?.matched) {
    //   return res.status(400).send({
    //     code: 1005,
    //     data: 'کد ملی با شماره تلفن تطابق ندارد'
    //   });
    // }
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
    // if (!user.isBlockSMS) {
      // sms.referral(user.name + ' ' + user.lastName, user.code, user.phoneNumber);
    // }
    // try {
    //   await getRepository(Discount).insert({
    //     userId: user.id,
    //     title: 'welcome',
    //     percent: 10,
    //     code: user.code,
    //     active: true,
    //     maxCount: 10,
    //   });
    // } catch (e) {
    //   console.log(e);
    //   return res.status(409).send({ 'code': 409 });
    // }

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

}

export default LoginController;
