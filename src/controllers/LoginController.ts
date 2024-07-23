import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwtD from 'jwt-decode';
import * as jwt from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import config from '../config/config';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, roles } from '../utils/enums';
import { generateCode, signJWT, signTmpJWT } from '../utils/funs';
import sms from '../utils/smsLookup';

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
    await sms.welcome(code, phoneNumber);
    return res.status(200).send({
      token: token
    });
  };
  static loginWorker = async (req: Request, res: Response): Promise<Response> => {
    const { phoneNumber } = req.body;
    if (!(phoneNumber)) {
      return res.status(400).send({ 'message': 'Phone number not set' });
    }
    const code = generateCode();
    let token = '';
    let user: User;
    user = await this.users().findOne({ where: { phoneNumber } });
    if (!user || user.role != roles.WORKER) {
      return res.status(401).send({
        code: 401,
        data: "Invalid Login"
      })
    }
    user.tmpCode = code;
    user = await this.users().save(user);
    token = await signTmpJWT({
      id: user.id,
      code: code
    }, '2m');
    await sms.welcome(code, phoneNumber);
    return res.status(200).send({
      token: token
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
      user = await this.users().findOne({
        where: {
          username: username,
          role: 'SUPER_ADMIN'
        }
      });
    } catch (e) {
      return res.status(401).send({
        code: 400,
        data: 'Invalid Credentials'
      });
    }
    if (!bcrypt.compareSync(password, user.password)) {
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
    const newToken = user.isVerified ? await signJWT(user) : await signTmpJWT(user);

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
}

export default LoginController;
