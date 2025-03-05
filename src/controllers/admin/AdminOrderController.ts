import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { Brackets, FindManyOptions, MoreThanOrEqual, getRepository, In, LessThan, LessThanOrEqual, Like, MoreThan, Not, Between, Raw, ArrayContainedBy } from 'typeorm';
import { Color } from '../../entity/Color';
import { Feedback } from '../../entity/Feedback';
import { Order } from '../../entity/Order';
import { OrderService } from '../../entity/OrderService';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';

import { orderStatus, orderStatusNames, roles } from '../../utils/enums';
import sms from '../../utils/sms';

class AdminOrderController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(User);
  static orders = () => getRepository(Order);
  static index = async (req: Request, res: Response): Promise<Response> => {
    const { page, perPage = 25, status, query } = req.query;

    if (!page) {
      const orders = await getRepository(Order).find({
        relations: {
          worker: true,
          service: true,
          orderServices: { service: true },
          user: true
        }
      });
      return res.status(200).send({ code: 200, data: orders });
    }

    const baseWhere = [
      { user: { name: Like(`%${query}%`) }, inCart: false },
      { user: { lastName: Like(`%${query}%`) }, inCart: false },
      { user: { phoneNumber: Like(`%${query}%`) }, inCart: false },
      { worker: { name: Like(`%${query}%`) }, inCart: false },
      { worker: { lastName: Like(`%${query}%`) }, inCart: false },
      { code: Like(`%${query}%`), inCart: false }
    ];

    const options: FindManyOptions = {
      relations: {
        worker: true,
        service: true,
        orderServices: { service: true },
        user: true
      },
      take: Number(perPage),
      skip: Number(perPage) * (Number(page) - 1 || 0),
      order: {
        date: 'DESC',
        fromTime: 'DESC'
      },
      where: status ? baseWhere.map(condition => ({ ...condition, status })) : baseWhere
    };

    try {
      const orderRepository = getRepository(Order);
      const [orders, count] = await orderRepository.findAndCount(options);

      const allOrders = await orderRepository.find({
        where: { inCart: false },
        relations: { worker: true, orderServices: { service: true }}
      });

      const statusCount = Object.entries(orderStatusNames).reduce((acc, [status, statusTitle]) => ({
        ...acc,
        [status]: {
          count: allOrders.filter(e => e.status === status).length,
          title: statusTitle
        }
      }), {
        all: {
          count: allOrders.length,
          title: 'All'
        }
      });

      return res.status(200).send({
        code: 200,
        data: {
          orders,
          count,
          statusCount
        }
      });
    } catch (e) {
      console.log(e);
      return res.status(501).send({
        code: 501,
        data: 'Unknown Error'
      });
    }
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

    order.inCart = (status == orderStatus.Created);
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
    order.isWebsite = false;

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
      if (order.workerId){
        let workerOff = await getRepository(WorkerOffs).findOneBy({
          userId: order.workerId,
          orderId: order.id
        });

        if(!workerOff){
          workerOff = new WorkerOffs();
          workerOff.userId = order.workerId;
          workerOff.orderId = order.id;
        }

        workerOff.date = order.date;
        workerOff.fromTime = order.fromTime;
        workerOff.toTime = Number(order.fromTime) + Number(newOrderServices.reduce((acc, curr) => acc + curr.service.section, 0));
        await getRepository(WorkerOffs).save(workerOff);
      }
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
      sms.orderAssignWorkerChange(order.worker.name + ' ' + order.worker.lastName, order.code, order.worker.phoneNumber);

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
      sms.orderAssignUser(order.user.name, user.name + ' ' + user.lastName, order.user.phoneNumber, order.date, order.fromTime.toString());
      sms.orderAssignWorker(order.worker.name + ' ' + order.worker.lastName, order.orderServices?.reduce((acc, cur) => acc + '-' + cur.service.title, '').toString(), order.address.description, user.phoneNumber, order.date, order.fromTime.toString());
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

    const busyWorkerIds = await getRepository(WorkerOffs)
    .find({
      select: ['userId'],
      where: [
        {
          date: order.date,
          fromTime: MoreThanOrEqual(order.fromTime),
          toTime: LessThan(order.toTime)
        },
        {
          date: order.date,
          fromTime: LessThanOrEqual(order.fromTime),
          toTime: MoreThan(order.toTime)
        },
        {
          date: order.date,
          fromTime: LessThanOrEqual(order.fromTime),
          toTime: MoreThan(order.fromTime)
        },
        {
          date: order.date,
          fromTime: LessThan(order.toTime),
          toTime: MoreThan(order.toTime)
        }
      ]
    });

    const availableWorkers = await this.users().find({
      select: ['id', 'name', 'lastName'],
      where: {
        role: roles.WORKER,
        status: 1,
        services: { id: ArrayContainedBy(order.orderServices.map((e => e.serviceId ))) },
        id: Not(In(busyWorkerIds.map(w => w.userId)))
      }
    });
    return res.status(200).send({
      code: 200,
      data: availableWorkers
    });
  };
}

export default AdminOrderController;
