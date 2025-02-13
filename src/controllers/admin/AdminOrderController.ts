import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { getRepository, In } from 'typeorm';
import { Color } from '../../entity/Color';
import { Feedback } from '../../entity/Feedback';
import { Order } from '../../entity/Order';
import { OrderService } from '../../entity/OrderService';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';

import { orderStatus, roles } from '../../utils/enums';
import smsLookup from '../../utils/smsLookup';

class AdminOrderController {
  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static index = async (req: Request, res: Response): Promise<Response> => {
    let orders;
    try {
      orders = await this.orders().find({
        relations: ['worker', 'service', 'orderServices.service', 'user'],
        relationLoadStrategy: 'query'
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
        relations: ['worker', 'service.parent', 'address', 'orderServices', 'user.addresses', 'finalImage', 'orderServices.colors']
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

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
      status,
      date,
      time,
      finalPrice,
      price,
      discountAmount,
      transportation,
      serviceId,
      addressId,
      userId,
      isUrgent
    } = req.body;
    let order: Order, user: User;
    if (id) {
      try {
        order = await this.orders().findOneOrFail({
          where: { id: Number(id) },
          relations: {
            orderServices: { service: true },
            worker: true
          }
        });

      } catch (error) {
        console.log(error);
        res.status(400).send({
          code: 400,
          data: 'Invalid Order'
        });
        return;
      }
    } else {
      order = new Order();
      order.code = 'NIL-' + (10000 + await getRepository(Order).count({ where: { inCart: false }}));
    }

    order.inCart = status == orderStatus.Created;
    order.date = date;
    order.discountAmount = discountAmount;
    order.addressId = addressId;
    order.userId = userId;
    order.price = price;
    order.finalPrice = finalPrice;
    order.transportation = transportation;
    order.serviceId = serviceId;
    order.fromTime = time;
    order.toTime = Number(time) + 1;
    order.isUrgent = isUrgent;

    if (id && order.status != orderStatus.Done && status == orderStatus.Done) {
      order.doneDate = new Date();
      // await getRepository(User).update({ id: order.workerId }, { walletBalance: order?.worker.walletBalance + ((order.price * order.workerPercent / 100) + order.transportation)})
    }

    order.status = status;

    const errors = await validate(order);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.orders().save(order);

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

  static services = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { services } = req.body;
    let order: Order;
    try {
      order = await this.orders().findOneOrFail({
        where: { id: Number(id) },
        relations: { orderServices: { service: true } }
      });

    } catch (error) {
      console.log(error);
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }

    for (const orderService of order.orderServices) {
      if (!services.find(e => e.serviceId == orderService.serviceId)) {
        await getRepository(OrderService).delete({ id: orderService.id });
      }
    }
    const newOrderServices = [];
    for (const service of services) {
      const serviceObj = await getRepository(Service).findOneBy({ id: service.id });
      let orderService = order.orderServices.find(e => e.serviceId == service.serviceId);
      if (!orderService) {
        orderService = new OrderService();
        orderService.orderId = order.id;
      }
      orderService.serviceId = service.serviceId;
      orderService.count = service.count;
      orderService.singlePrice = serviceObj.price * (order.isUrgent ? 1.5 : 1);
      orderService.price = serviceObj.price * (order.isUrgent ? 1.5 : 1) * service.count;
      if (service.colors && service.colors.length > 0) {
        orderService.colors = await getRepository(Color).findBy({ id: In(service.colors) });
      }
      await getRepository(OrderService).save(orderService);
      newOrderServices.push({
        ...orderService,
        service: { section: serviceObj.section }
      });
    }

    try {
      await this.orders().update({ id: order.id }, {
        isMulti: services.filter(e => e.count > 1).length > 0,
        toTime: Number(order.fromTime) + Number(newOrderServices.reduce((acc, curr) => acc + curr.service.section, 0))
      });
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
  static assign = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
      workerId
    } = req.body;
    let order: Order, user: User;
    try {
      order = await this.orders().findOneOrFail({
        where: { id: Number(id) },
        relations: ['service', 'user', 'worker', 'orderServices', 'address']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }

    if (order.workerId) {
      await getRepository(WorkerOffs).delete({
        userId: order.workerId,
        orderId: order.id
      });
    }

    try {
      user = await this.users().findOneOrFail({
        where: {
          id: workerId,
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
      smsLookup.orderAssignUser(order.user.name, user.name + ' ' + user.lastName, order.user.phoneNumber, order.date, order.fromTime.toString());
      smsLookup.orderAssignWorker(order.orderServices?.reduce((acc, cur) => acc + '-' + cur.service.title, '').toString(), order.address.description, user.phoneNumber, order.date, order.fromTime.toString());
      await getRepository(WorkerOffs).insert({
        fromTime: order.fromTime,
        toTime: order.toTime,
        orderId: order.id,
        userId: workerId,
        date: order.date
      });
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

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      await getRepository(Order).delete({ id: Number(id) });
    } catch (e) {
      console.log(e);
      res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
      return;
    }
    return res.status(200).send({
      code: 204,
      data: 'Successful'
    });
  };
  static feedback = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let feedback: Feedback;
    try {
      feedback = await getRepository(Feedback).findOneOrFail({
        where: { orderId: Number(id) },
        relations: { feedbackFactors: true }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }
    return res.status(200).send({
      code: 200,
      data: feedback
    });
  };
  static getRelatedWorkers = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    let order: Order, users: User[];
    try {
      order = await this.orders().findOneOrFail({
        where: { id: Number(id) },
        relations: ['service', 'user', 'orderServices']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }

    try {
      users = await this.users().find({
        where: {
          role: roles.WORKER,
          status: 1
        },
        relations: {
          services: true,
          workerOffs: true
        },
        relationLoadStrategy: 'query'
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        code: 400,
        data: 'Invalid Worker'
      });
      return;
    }
    const suitableWorkers = users.filter(e => order.orderServices.map(j => j.serviceId).every(k => e.services?.map(e => e.id).includes(k)));
    // const freeWorkers = suitableWorkers?.filter(j => !j.workerOffs.find(e => {
    //   return (e.date == order.date &&
    //   ((e.fromTime > order.fromTime && e.toTime < order.toTime) ||
    //     (e.fromTime <= order.fromTime && e.toTime > order.toTime))
    //   )
    // }));
    const freeWorkers = suitableWorkers?.filter(worker => !worker.workerOffs.find(timeOff => {
      return (
        timeOff.date === order.date && (
          // Case 1: Worker's off time is completely within order time
          (timeOff.fromTime >= order.fromTime && timeOff.toTime <= order.toTime) ||
          // Case 2: Order time is completely within worker's off time
          (timeOff.fromTime <= order.fromTime && timeOff.toTime >= order.toTime) ||
          // Case 3: Worker's off time overlaps with start of order
          (timeOff.fromTime <= order.fromTime && timeOff.toTime > order.fromTime) ||
          // Case 4: Worker's off time overlaps with end of order
          (timeOff.fromTime < order.toTime && timeOff.toTime >= order.toTime)
        )
      );
    }));
    return res.status(200).send({
      code: 200,
      data: freeWorkers

    });
  };
}

export default AdminOrderController;
