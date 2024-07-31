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
import smsLookup from '../../utils/smsLookup';
import { jwtDecode, omit } from '../../utils/funs';

class WorkerOrderController {

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
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }
    let orders;
    try {
        orders = await this.orders().find({
          where: {
            workerId: user.id
          },
          relations: ['orderServices.colors', 'orderServices.media', 'service', 'address', 'worker']
        });
    } catch (e) {
      console.log(e);
      res.status(400).send({
        code: 400,
        data: 'Unexpected Error'
      });
    }
    return res.status(200).send({
      code: 200,
      data: orders
    });
  };

  static single = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    const { code } = req.params;

    let order: Order = await getRepository(Order).findOne({
      where: {
        code: code,
        userId: userId
      },
      relations: {
        feedback: true,
        user: true
      }
    });

    if (!order) {
      return res.status(400).send({
        code: 400,
        data: 'Order Not Found'
      });
    }

    return res.status(200).send({
      code: 200,
      data: order
    });

  };
  static statusStart = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const userId = jwtDecode(req.headers.authorization);
    let order: Order;

    try {
      order = await getRepository(Order).findOneBy({ id: Number(id), workerId: userId, status: orderStatus.Assigned })
    }catch (e){
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      })
    }
    if (moment().format('jYYYY/jMM/jDD') != order.date){
      if (Number(moment().format('HH')) - order.fromTime > 1){
        return res.status(400).send({
          code: 2001,
          data: 'Invalid Time'
        })
      }
      return res.status(400).send({
        code: 2000,
        data: 'Invalid Date'
      })
    }

    order.status = orderStatus.InProgress;

    try {
      await this.orders().save(order);
    } catch (e) {
      res.status(409).send('error try again later');
      return;
    }
    return res.status(200).send({
      code: 200,
      data: 'Successful'
    });
  }
  static statusDone = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const userId = jwtDecode(req.headers.authorization);
    let order: Order;

    try {
      order = await getRepository(Order).findOneBy({ id: Number(id), workerId: userId, status: orderStatus.InProgress })
    }catch (e){
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      })
    }

    if (moment().format('jYYYY/jMM/jDD') != order.date){
      if (Number(order.toTime - Number(moment().format('HH'))) > 1){
        return res.status(400).send({
          code: 2001,
          data: 'Invalid Time'
        })
      }
      return res.status(400).send({
        code: 2000,
        data: 'Invalid Date'
      })
    }
    order.status = orderStatus.Done;
    console.log((req as any).files);
    console.log((req as any).file);
    order.doneDate = new Date();
    order.finalImageId = await media.create(res, (req as any).files[0], order.code + '-finalImage', '/public/uploads/finalOrder');

    try {
      await this.orders().save(order);
    } catch (e) {
      res.status(409).send('error try again later');
      return;
    }
    return res.status(200).send({
      code: 200,
      data: 'Successful'
    });
  }
  static update = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    let user, orderObj;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }
    const {
      orderId,
      done
    } = req.body;
    try {
      orderObj = await this.orders().findOneOrFail({
        where: {
          id: orderId,
          status: orderStatus.Assigned,
          workerId: user.id,
        },
        relations: { user: true }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }
    if (!done) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid Status'
      });
    }

    orderObj.status = orderStatus.Done;
    orderObj.doneDate = new Date();
    smsLookup.feedback(orderObj.user.name, orderObj.user.phoneNumber, orderObj.code);

    try {
      await this.orders().save(orderObj);
    } catch (e) {
      res.status(409).send('error try again later');
      return;
    }
    return res.status(200).send({
      code: 200,
      data: ''
    });
  };
}

export default WorkerOrderController;
