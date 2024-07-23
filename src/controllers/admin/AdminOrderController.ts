import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { getRepository } from 'typeorm';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';

import { orderStatus } from '../../utils/enums';
import smsLookup from '../../utils/smsLookup';

class AdminOrderController {
  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static services = () => getRepository(Service);
  static index = async (req: Request, res: Response): Promise<Response> => {
    let orders;
    try {
      orders = await this.orders().find({
        relations: ['worker', 'service', 'address', 'orderServices', 'user']
      });
    } catch (e) {
      return res.status(400).send({
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
    const { id } = req.params;
    let order;
    try {
      order = await this.orders().findOne({
        where: { id: Number(id) },
        relations: ['worker', 'service.parent', 'address', 'orderServices', 'user']
      });
    } catch (e) {
      return res.status(400).send({
        code: 400,
        data: 'Unexpected Error'
      });
    }
    return res.status(200).send({
      code: 200,
      data: order
    });
  };

  static assign = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
      workerId
    } = req.body;
    let order: Order, user: User;
    try {
      order = await this.orders().findOneOrFail({
        where: { id: Number(id) },
        relations: ['service', 'user', 'orderServices', 'address']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }

    try {
      user = await this.users().findOneOrFail({
        where: {
          id: workerId,
          serviceId: order.service.id,
        }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Worker'
      });
      return;
    }
    order.worker = user;
    order.status = orderStatus.Assigned;
    order.workerPercent = user.percent;

    const errors = await validate(order);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.orders().save(order);
      smsLookup.orderAssignUser(order.user.name, user.name + ' ' + user.lastName, order.user.phoneNumber, moment(Number(order.date) * 1000).format('jYYYY/jMM/jDD'), order.fromTime.toString());
      smsLookup.orderAssignWorker(order.orderServices?.map(e => e.service.title).toString(), order.address.description, user.phoneNumber, moment(Number(order.date) * 1000).format('jYYYY/jMM/jDD'), order.fromTime.toString());
    } catch (e) {
      console.log(e);
      res.status(409).send('error try again later');
      return;
    }
    return res.status(200).send({
      code: 200,
      data: order
    });
  };

}

export default AdminOrderController;
