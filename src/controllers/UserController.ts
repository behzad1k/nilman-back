import { validate } from 'class-validator';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';
import { getRepository } from 'typeorm';
import config from '../config/config';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, roles } from '../utils/enums';
import { generateCode, getUserId } from '../utils/funs';
import sms from '../utils/sms';

class UserController {
  static users = () => getRepository(User)
  static workerOffs = () => getRepository(WorkerOffs)

  // Authentication
  static signJWT = async (user: { id: any; role: any }, exp?): Promise<string> => {
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      config.jwtSecret,
      {
        expiresIn: exp || config.expiration,
        issuer: config.issuer,
        audience: config.audience,
      },
    );

    return token;
  };

  static signTmpJWT = async (data, exp?): Promise<string> => {
    const token = jwt.sign(
      data,
      config.jwtSecret,
      {
        expiresIn: exp || config.expiration,
        issuer: config.issuer,
        audience: config.audience,
      },
    );

    return token;
  };

  static login = async (req: Request, res: Response): Promise<Response> => {
    const { phoneNumber } = req.body;
    if (!(phoneNumber)) {
      return res.status(400).send({ 'message': 'Phone number not set' });
    }
    const code = generateCode();
    let token = '';
    let user: User;
    user = await this.users().findOne({ where: { phoneNumber } });
    if (!user) {
      user = new User()
      user.phoneNumber = phoneNumber;
      user.role = roles.USER
      user.password = '12345678';
      user.code = generateCode(8, dataTypes.string);
      // user.password = user.generatePassword();
      await user.hashPassword();
      user = await this.users().save(user);
    }
    user.tmpCode = code;
    user = await this.users().save(user);
    token = await UserController.signJWT(user);
    sms.welcome(code, phoneNumber);
    return res.status(200).send({
      code: code,
      token: token
    });
  };
  // TODO: auth check doesnt check the token

  static authCheck = async (req: Request, res: Response): Promise<Response> => {
    const { token, code } = req.body
    if (!token && code) {
      return res.status(400).send({ 'message': 'Bad Request' })
    }
    const tokens: any = jwtDecode(token);
    const userId = tokens.id
    const sysCode = tokens.code
    const userRepository = getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail(userId);
    } catch (e) {
      return res.status(401).send({ 'message': 'User not found' })
    }
    if (sysCode !== code) {
      return res.status(401).send({ 'message': 'Code does not match' })
    }
    const newToken = await UserController.signJWT(user)
    return res.status(200).send({
      code: 200,
      data: {
        user: user,
        token: newToken
      }
    });
  }

  static getUser = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail(id)
    } catch (e) {
      return res.status(400).send({ 'code': 400, 'data': 'Invalid User' })
    }
    return res.status(200).send({ 'code': 200, 'data': user });
  }
  static changePassword = async (req: Request, res: Response): Promise<Response> => {
    // Get ID from JWT
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    // Get parameters from the body
    const { oldPassword, newPassword } = req.body;
    if (!(oldPassword && newPassword)) {
      res.status(400).send();
    }

    // Get user from the database
    const userRepository = getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail(id);
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
    userRepository.save(user);

    return res.status(204).send();
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail(id)
    } catch (e) {
      return res.status(400).send({ code: 400, data: "Invalid User" })
    }
    const { name, lastName, nationalCode, phoneNumber } = req.body;
    if (name)
      user.name = name
    if (lastName)
      user.lastName = lastName
    if (nationalCode)
      user.nationalCode = nationalCode
    if (phoneNumber)
      user.phoneNumber = phoneNumber
    try {
      await this.users().save(user);
    } catch (e) {
      return res.status(409).send({ "code": 409 });
    }
    return res.status(200).send({ code: 200, user })
  }
  static getAddresses = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    const userRepository = getRepository(User);
    let user;
    try {
      user = await userRepository.findOneOrFail(id, {
        relations: ['addresses']
      });
    } catch (error) {
      res.status(400).send({ code: 400, data: "Invalid UserId" });
      return;
    }
    return res.status(200).send({
      code: '200',
      data: user.addresses
    })
  }

  static getWorkerOffs = async (req: Request, res: Response): Promise<Response> => {
    const { workerId, date } = req.query;
    let workerOff;
    if (!date){
      return res
    }
    if (workerId){
      try{
        workerOff = await this.workerOffs().find({
          where: {
            workerId: Number(workerId),
            date: Number(date)
          }
        })
      }catch (e){
        return res.status(400).send({code: 400, data: "Invalid WorkerId"})
      }
    }else {
      try{
        workerOff = await this.workerOffs().find({
          where: {
            date: Number(date)
          }
        })

      }catch (e){
        console.log(e);
        return res.status(400).send({code: 400, data: "Unexpected Error"})
      }
    }
    return res.status(200).send({code: 200, data: workerOff})
  }

}

export default UserController;
