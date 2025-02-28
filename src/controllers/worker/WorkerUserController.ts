import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { getRepository, MoreThan } from 'typeorm';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { jwtDecode } from '../../utils/funs';
import sms from '../../utils/sms';

class WorkerUserController {
  static users = () => getRepository(User);

  static bankInfo = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
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
      return res.status(409).send({
        code: 409,
        date: 'error try again later'
      });
    }

    return res.status(200).send({
      code: 200,
      user: user,
    });
  };
  static workerOffs = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);

    const workerOffs = await getRepository(WorkerOffs).findBy({ userId: Number(userId) });

    const formattedWorkerOffs: any = {};
    workerOffs.map(e => {
      if (!formattedWorkerOffs[e.date]) {
        formattedWorkerOffs[e.date] = [];
      }
      formattedWorkerOffs[e.date].push(e.fromTime);
    });
    return res.status(200).send({
      code: 200,
      data: formattedWorkerOffs,
    });
  };
  static createWorkerOffs = async (req: Request, res: Response): Promise<Response> => {
    const {
      workerOffs
    } = req.body;
    const userId = jwtDecode(req.headers.authorization);

    try {
      await getRepository(WorkerOffs).delete({
        userId: userId,
        date: MoreThan(moment().subtract(1, 'day').format('jYYYY/jMM/jDD')),
        isStrict: false
      });
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        date: 'error try again later'
      });
    }

    for (const [key, value] of Object.entries(workerOffs)) {
      for (const time of (value as any)) {
        try {
          const workerOff = await getRepository(WorkerOffs).findOneBy({
            userId: userId,
            date: key,
            fromTime: time,
            toTime: time + 2,
          });
          if (!workerOff) {
            await getRepository(WorkerOffs).insert({
              userId: userId,
              date: key,
              fromTime: time,
              toTime: time + 2,
              isStrict: false
            });
          }
        } catch (e) {
          console.log(e);
          return res.status(409).send({
            code: 409,
            date: 'error try again later'
          });
        }
      }
    }
    return res.status(200).send({
      code: 200,
      data: ''
    });
  };

  static emergency = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    const {
      code,
      phoneNumber
    } = req.body;
    // let workerPhoneNumber = phoneNumber, orderCode = code;
    try {
      // if (!orderCode){
      //   const order = await getRepository(Order).find({ where: { workerId: Number(userId), status: In([orderStatus.InProgress, orderStatus.Assigned])}, order: })
      // }
      const user = await getRepository(User).findOneBy({ id: Number(userId) });
      sms.emergency((code || 'نامشخص'), user.name, user.lastName);

    } catch (e) {

    }
    return res.status(200).send({
      code: 204,
      data: 'Successful'
    });
  };

}

export default WorkerUserController;
