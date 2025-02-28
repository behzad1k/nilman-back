import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { getRepository, In } from 'typeorm';
import ZarinPalCheckout from 'zarinpal-checkout';
import { Discount } from '../../entity/Discount';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { orderStatus } from '../../utils/enums';
import media from '../../utils/media';
import sms from '../../utils/sms';
import { jwtDecode, omit } from '../../utils/funs';

class WorkerTransactionController {

  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static services = () => getRepository(Service);
  static workerOffs = () => getRepository(WorkerOffs);
  static discounts = () => getRepository(Discount);
  static index = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    const users = await this.users().find();
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
        relations: { transactions: { media: true } }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }

    return res.status(200).send({
      code: 200,
      data: user.transactions
    });
  };


}

export default WorkerTransactionController;
