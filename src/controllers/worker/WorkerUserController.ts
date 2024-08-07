import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import jwtD from 'jwt-decode';
import { use } from 'passport';
import { getRepository } from 'typeorm';
import { Discount } from '../../entity/Discount';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { jwtDecode, signJWT } from '../../utils/funs';
import sms from '../../utils/sms';
import smsLookup from '../../utils/smsLookup';

class WorkerUserController {
  static users = () => getRepository(User);

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
  static workerOffs = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);

    const workerOffs = await getRepository(WorkerOffs).findBy({ userId: Number(userId)});

    const formattedWorkerOffs: any = {};
    workerOffs.map(e => {
      if (!formattedWorkerOffs[e.date]){
        formattedWorkerOffs[e.date] = []
      }
      formattedWorkerOffs[e.date].push(e.fromTime);
    })
    return res.status(200).send({
      code: 200,
      data: formattedWorkerOffs,
    });
  }
  static createWorkerOffs = async (req: Request, res: Response): Promise<Response> => {
    const {
      workerOffs
    } = req.body;
    const userId = jwtDecode(req.headers.authorization);

    for (const [key, value] of Object.entries(workerOffs)) {
      for (const time of (value as any)) {
        const workerOff = await getRepository(WorkerOffs).findOneBy({
          userId: userId,
          date: key,
          fromTime: time,
          toTime: time + 2,
        })
        if (!workerOff) {
          await getRepository(WorkerOffs).insert({
            userId: userId,
            date: key,
            fromTime: time,
            toTime: time + 2,
          });
        }
      }
    }
    Object.entries(workerOffs).map(([key, value]) => {

    })
    // const errors = await validate(serviceObj);
    // if (errors.length > 0) {
    //   return res.status(400).send(errors);
    // }
    // try {
    //   await this.services().save(serviceObj);
    // } catch (e) {
    //   res.status(409).send("error try again later");
    //   return;
    // }
    return res.status(200).send({code: 200, data: ''});
  };

  static emergency = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    const { code, phoneNumber } = req.body;
    // let workerPhoneNumber = phoneNumber, orderCode = code;
    try {
      // if (!orderCode){
      //   const order = await getRepository(Order).find({ where: { workerId: Number(userId), status: In([orderStatus.InProgress, orderStatus.Assigned])}, order: })
      // }
      const user = await getRepository(User).findOneBy({ id: Number(userId) })
      smsLookup.emergency((code || 'نامشخص'), user.name, user.lastName)

    }catch (e){

    }
    return res.status(200).send({code: 204, data: 'Successful'});
  }

}

export default WorkerUserController;
