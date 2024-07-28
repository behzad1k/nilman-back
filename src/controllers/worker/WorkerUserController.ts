import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import jwtD from 'jwt-decode';
import { getRepository } from 'typeorm';
import { Discount } from '../../entity/Discount';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { jwtDecode, signJWT } from '../../utils/funs';
import sms from '../../utils/sms';

class WorkerUserController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(WorkerOffs);

  static bankInfo = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization)
    const {
      cardNumber,
      shebaNumber,
      hesabNumber,
      bankName,
    } = req.body;

    let user: User;
    try {
      user = await getRepository(User).findOneOrFail({
        where: { id: id },
      });
    } catch (e) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
    }

    user.bankName = bankName;
    user.shebaNumber = shebaNumber;
    user.hesabNumber = hesabNumber;
    user.cardNumber = cardNumber;

    try {
      await getRepository(User).save(user);
    } catch (e) {
      return res.status(409).send({ 'code': 409 });
    }


    return res.status(200).send({
      code: 200,
      user: user,
    });
  };

}

export default WorkerUserController;
