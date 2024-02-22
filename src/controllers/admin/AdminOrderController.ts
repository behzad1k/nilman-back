import { Request, Response } from "express";
import { stat } from "fs";
import * as jwtDecode from "jwt-decode";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import {Order} from "../../entity/Order";
import { Service } from "../../entity/Service";
import { User } from "../../entity/User";

import { orderStatus } from '../../utils/enums';
import { getObjectValue } from "../../utils/funs";
import sms from '../../utils/smsLookup';

class AdminOrderController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static services = () => getRepository(Service)
  static index = async (req: Request, res: Response): Promise<Response> => {
    let orders;
    try{
      orders = await this.orders().find({
        relations: ['worker', 'service', 'address', 'attributes', 'user']
      });
    }catch (e){
      return res.status(400).send({code: 400, data: 'Unexpected Error'})
    }
    return res.status(200).send({
      code: 200,
      data: orders
    })
  }

  static update = async (req: Request, res: Response): Promise<Response> => {
    const { orderId, workerId } = req.body;
    let order: Order, user: User;
    try {
      order = await this.orders().findOneOrFail({
        where: { id: orderId },
        relations: ['service', 'user']
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Order"});
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
        res.status(400).send({code: 400, data:"Invalid Worker"});
      return;
    }
    order.worker = user
    order.status = orderStatus.Assigned

    const errors = await validate(order);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.orders().save(order);
    } catch (e) {
      res.status(409).send("error try again later");
      return;
    }
    return res.status(200).send({code: 200, data: order});
  };

}
export default AdminOrderController;
