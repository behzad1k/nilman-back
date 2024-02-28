import * as bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';
import { getRepository } from 'typeorm';
import config from '../config/config';
import { Discount } from '../entity/Discount';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, roles } from '../utils/enums';
import { generateCode } from '../utils/funs';
import sms from '../utils/smsLookup';

class UserController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(WorkerOffs);

  // Authentication
  static signJWT = async (user: {
    id: any;
    role: any
  }, exp?): Promise<string> => {
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

  static signTmpJWT = async (user: {
    id: any;
    code: any
  }, exp?): Promise<string> => {
    const token = jwt.sign(
      {
        userId: user.id,
        code: user.code,
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
    token = await UserController.signTmpJWT({
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
    user = await this.users().findOne({ where: { username: username } });
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).send({
        code: 400,
        data: 'Invalid password'
      });
    }
    const token = await UserController.signJWT(user);
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
    const tokens: any = jwtDecode(token);
    const userId = tokens.userId;
    const sysCode = tokens.code;
    const userRepository = getRepository(User);

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

    const newToken = await UserController.signJWT(user);

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

  static getUser = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
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
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
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
    userRepository.save(user);

    return res.status(204).send();
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    const {
      name,
      lastName,
      nationalCode,
      phoneNumber
    } = req.body;
    if (!name) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid name'
      });
    }
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

    if (!user.name) {
      sms.referral(user.name + ' ' + user.lastName, user.code, user.phoneNumber);
      try {
        await getRepository(Discount).insert({
          title: user.name + ' ' + user.lastName,
          percent: 10,
          code: user.code,
          active: true
        });
      } catch (e) {
        return res.status(409).send({ 'code': 409 });
      }
    }

    if (name)
      user.name = name;
    if (lastName)
      user.lastName = lastName;
    if (nationalCode)
      user.nationalCode = nationalCode;
    if (phoneNumber)
      user.phoneNumber = phoneNumber;

    try {
      await this.users().save(user);

    } catch (e) {
      return res.status(409).send({ 'code': 409 });

    }
    return res.status(200).send({
      code: 200,
      user
    });
  };
  static getAddresses = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
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
            workerId: Number(workerId),
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
