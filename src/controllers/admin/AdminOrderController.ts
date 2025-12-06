import axios from 'axios';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { FindManyOptions, getRepository, In, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from 'typeorm';
import ZarinPalCheckout from 'zarinpal-checkout';
import { Address } from '../../entity/Address';
import { Color } from '../../entity/Color';
import { District } from '../../entity/District';
import { Feedback } from '../../entity/Feedback';
import { Order } from '../../entity/Order';
import { OrderService } from '../../entity/OrderService';
import { Payment } from '../../entity/Payment';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { dataTypes, orderStatus, orderStatusNames, PaymentMethods, roles } from '../../utils/enums';
import { generateCode, getUniqueOrderCode, getUniqueSlug } from '../../utils/funs';
import sms from '../../utils/sms';

class AdminOrderController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(WorkerOffs);
  static orders = () => getRepository(Order);

  static index = async (req: Request, res: Response): Promise<Response> => {
    const { page, perPage = 25, status, query } = req.query;

    // If no pagination, return minimal data
    if (!page) {
      const orders = await getRepository(Order).find({
        relations: {
          worker: true,
          service: true,
          orderServices: { service: true },
          user: true
        },
        select: {
          id: true,
          code: true,
          status: true,
          date: true,
          fromTime: true,
          toTime: true,
          finalPrice: true,
          price: true,
          worker: {
            id: true,
            name: true,
            lastName: true
          },
          service: {
            id: true,
            title: true
          },
          orderServices: {
            id: true,
            serviceId: true,
            service: {
              id: true,
              title: true
            }
          },
          user: {
            id: true,
            name: true,
            lastName: true,
            phoneNumber: true
          }
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

    try {
      const [ordersResult, statusCountResult] = await Promise.all([
        getRepository(Order).findAndCount({
          relations: {
            worker: true,
            service: true,
            orderServices: { service: true },
            user: true
          },
          take: Number(perPage),
          skip: Number(perPage) * (Number(page) - 1 || 0),
          order: {
            date: status == orderStatus.Assigned ? 'ASC' : 'DESC',
            fromTime: status == orderStatus.Assigned ? 'ASC' : 'DESC',
          },
          where: status ? baseWhere.map(condition => ({ ...condition, status })) : baseWhere
        }),

        getRepository(Order)
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('order.inCart = :inCart', { inCart: false })
        .groupBy('order.status')
        .getRawMany()
      ]);

      const [orders, count] = ordersResult;

      const statusCount = statusCountResult.reduce((acc, item) => {
        acc[item.status] = {
          count: parseInt(item.count),
          title: orderStatusNames[item.status] || item.status
        };
        return acc;
      }, {});

      return res.status(200).send({
        code: 200,
        data: {
          orders,
          count,
          statusCount,
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

    try {
      // Use QueryBuilder for better control
      const order = await this.orders()
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('order.worker', 'worker')
      .leftJoinAndSelect('order.service', 'service')
      .leftJoinAndSelect('service.parent', 'serviceParent')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.orderServices', 'orderServices')
      .leftJoinAndSelect('orderServices.service', 'orderServiceService')
      .leftJoinAndSelect('orderServices.colors', 'colors')
      .leftJoinAndSelect('orderServices.media', 'orderServiceMedia')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('user.addresses', 'userAddresses')
      .leftJoinAndSelect('order.finalImage', 'finalImage')
      .where('order.id = :id', { id: Number(id) })
      .getOne();

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
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Unexpected Error'
      });
    }
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
      workerId,
      userId,
      isUrgent,
      shouldSendWorkerSMS
    } = req.body;

    let order: Order, user: User;

    if (id) {
      try {
        order = await this.orders().findOneOrFail({
          where: { id: Number(id) },
          relations: {
            orderServices: { service: true },
            worker: true,
            payment: true
          },
          select: {
            id: true,
            code: true,
            status: true,
            date: true,
            fromTime: true,
            toTime: true,
            price: true,
            finalPrice: true,
            workerId: true,
            workerPercent: true,
            orderServices: {
              id: true,
              serviceId: true,
              service: {
                id: true,
                section: true
              }
            },
            worker: {
              id: true,
              name: true,
              lastName: true,
              phoneNumber: true
            }
          }
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send({
          code: 400,
          data: 'Invalid Order'
        });
      }
    } else {
      order = new Order();
      order.isWebsite = false;
    }

    try {
      user = await this.users().findOneOrFail({
        where: { id: Number(userId) },
        select: ['id', 'name', 'phoneNumber', 'isBlockSMS']
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
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

    if (status != orderStatus.Created && !order.code) {
      order.code = await getUniqueOrderCode();
    }

    if (id && order.status != orderStatus.Done && status == orderStatus.Done) {
      order.doneDate = new Date();
    }

    order.status = status;

    const errors = await validate(order);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }

    try {
      if (status == orderStatus.Canceled) {
        if (order.worker) {
          sms.orderAssignWorkerChange(order.worker.name + ' ' + order.worker.lastName, order.code, order.worker.phoneNumber);
        }
        await getRepository(WorkerOffs).delete({
          orderId: order.id
        });
      }

      await this.orders().save(order);

      if (workerId) {
        order.user = user;
        order.address = await getRepository(Address).findOneBy({ id: Number(addressId) });
        await this.assignOrder(order, workerId, shouldSendWorkerSMS);
      }
    } catch (e) {
      console.log(e);
      return res.status(409).send('error try again later');
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
        relations: { orderServices: { service: true } },
        select: {
          id: true,
          fromTime: true,
          isUrgent: true,
          workerId: true,
          date: true,
          orderServices: {
            id: true,
            serviceId: true,
            service: {
              section: true
            }
          }
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
    }

    // Delete removed services
    const servicesToDelete = order.orderServices.filter(
      orderService => !services.find(s => s.serviceId == orderService.serviceId)
    );

    if (servicesToDelete.length > 0) {
      await getRepository(OrderService).delete(
        servicesToDelete.map(s => s.id)
      );
    }

    // Batch load all service data
    const serviceIds = services.map(s => s.serviceId);
    const serviceObjects = await getRepository(Service).findBy({
      id: In(serviceIds)
    });

    const serviceMap = new Map(serviceObjects.map(s => [s.id, s]));

    const newOrderServices = [];

    for (const service of services) {
      const serviceObj = serviceMap.get(service.serviceId);
      if (!serviceObj) continue;

      let orderService = order.orderServices.find(e => e.serviceId == service.serviceId);
      if (!orderService) {
        orderService = new OrderService();
        orderService.orderId = order.id;
      }

      orderService.singlePrice = serviceObj.price * (order.isUrgent ? 1.5 : 1);
      orderService.serviceId = service.serviceId;
      orderService.count = service.count;
      orderService.price = orderService.singlePrice * service.count;

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
      const totalSections = newOrderServices.reduce((acc, curr) => acc + curr.service.section, 0);

      await this.orders().update({ id: order.id }, {
        isMulti: services.filter(e => e.count > 1).length > 0,
        toTime: Number(order.fromTime) + (totalSections / 4)
      });

      if (order.workerId) {
        let workerOff = await getRepository(WorkerOffs).findOneBy({
          userId: order.workerId,
          orderId: order.id
        });

        if (!workerOff) {
          workerOff = new WorkerOffs();
          workerOff.userId = order.workerId;
          workerOff.orderId = order.id;
        }

        workerOff.date = order.date;
        workerOff.fromTime = order.fromTime;
        workerOff.toTime = Number(order.fromTime) + (totalSections / 4);

        await getRepository(WorkerOffs).save(workerOff);
      }
    } catch (e) {
      console.log(e);
      return res.status(409).send('error try again later');
    }

    return res.status(200).send({
      code: 200,
      data: order
    });
  };

  static payment = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
      shouldUseWallet,
      method,
      finalPrice,
      refId,
      description
    } = req.body;

    let order: Order, payment: Payment;

    try {
      order = await getRepository(Order).findOneOrFail({
        where: { id: Number(id) },
        relations: {
          user: true,
        },
        select: {
          id: true,
          paymentId: true,
          finalPrice: true,
          status: true,
          user: {
            id: true,
            walletBalance: true
          }
        }
      });

      if (order.paymentId) {
        payment = await getRepository(Payment).findOne({
          where: { id: order.paymentId },
        });
      }
    } catch (e) {
      console.log(e);
      return res.status(400).send({ code: 400, data: 'Invalid Order' });
    }

    if (!payment) {
      payment = new Payment();
      payment.randomCode = await getUniqueSlug(getRepository(Payment), generateCode(8), 'randomCode');
    }

    payment.refId = refId;
    payment.price = order?.finalPrice;
    payment.finalPrice = finalPrice;
    payment.method = method;
    payment.description = description;
    payment.isPaid = ![orderStatus.Canceled, orderStatus.AwaitingPayment, orderStatus.Created].includes(order?.status as any);

    let newWalletBalance = order?.user?.walletBalance || 0;

    if (shouldUseWallet && order?.user?.walletBalance > 0) {
      const walletDiff = order?.user?.walletBalance - order?.finalPrice;
      if (walletDiff >= 0) {
        newWalletBalance = walletDiff;
        payment.finalPrice = 0;
        payment.credit = order?.finalPrice;
      } else {
        newWalletBalance = 0;
        payment.finalPrice = Math.abs(walletDiff);
        payment.credit = order?.finalPrice - Math.abs(walletDiff);
      }
    }

    if (method == PaymentMethods.Credit) {
      payment.finalPrice = 0;
    }

    try {
      await getRepository(Payment).save(payment);

      if (shouldUseWallet && order?.user?.walletBalance > 0) {
        await getRepository(User).update({ id: order?.user?.id }, {
          walletBalance: newWalletBalance
        });
      }

      await getRepository(Order).update({ id: order.id }, {
        paymentId: payment.id
      });
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
    }

    return res.status(200).send({
      code: 200,
      data: payment
    });
  };

  static sendPortal = async (req: Request, res: Response): Promise<Response> => {
    const { finalPrice, method, refId, description } = req.body;
    const { id } = req.params;

    let orderObj: Order, url: string, authority: string, payment: Payment;

    try {
      orderObj = await getRepository(Order).findOneOrFail({
        where: { id: Number(id) },
        relations: {
          user: true,
          payment: true
        },
        select: {
          id: true,
          finalPrice: true,
          paymentId: true,
          user: {
            name: true,
            lastName: true,
            phoneNumber: true
          },
          payment: {
            id: true,
            randomCode: true
          }
        }
      });

      payment = orderObj.payment ? { ...orderObj.payment } : new Payment();

      if (!payment.id) {
        payment.randomCode = await getUniqueSlug(getRepository(Payment), generateCode(8, dataTypes.number), 'randomCode');
      }

      payment.finalPrice = finalPrice;
      payment.price = orderObj?.finalPrice;
      payment.method = method;
      payment.description = description;
      payment.refId = refId;
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Payment'
      });
    }

    try {
      if (payment.method == PaymentMethods.Sep) {
        const sepReq = await axios.post('https://sep.shaparak.ir/onlinepg/onlinepg', {
          action: 'token',
          TerminalId: 14436606,
          Amount: payment.finalPrice * 10,
          ResNum: generateCode(8, dataTypes.number),
          RedirectUrl: 'https://callback.nilman.co/verify/',
          CellNumber: orderObj?.user?.phoneNumber
        }, { timeout: 10000 });

        authority = sepReq.data.token;
        url = `https://sep.shaparak.ir/OnlinePG/SendToken?token=${authority}`;
      } else if (payment.method == PaymentMethods.Ap) {
        const apReq = await axios('https://ipgrest.asanpardakht.ir/v1/Token', {
          data: {
            'serviceTypeId': 1,
            'merchantConfigurationId': '270219',
            'localInvoiceId': payment.randomCode,
            'amountInRials': payment.finalPrice * 10,
            'localDate': moment().format('YYYYMMDD HHmmss'),
            'callbackURL': 'https://callback.nilman.co/verify/',
            'paymentId': payment.id,
          },
          headers: {
            usr: 'saln 5312721',
            pwd: 'MtK5786W'
          },
          method: 'POST',
          timeout: 10000
        });

        authority = apReq.data;
        url = `https://ipgrest.asanpardakht.ir/purchase?token=${authority}`;
      } else if (payment.method == PaymentMethods.Zarinpal) {
        const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
        const zarinpalResult = await zarinpal.PaymentRequest({
          Amount: payment.finalPrice,
          CallbackURL: 'https://app.nilman.co/payment/verify',
          Description: 'A Payment from Nilman',
          Mobile: orderObj.user.phoneNumber
        });

        if (zarinpalResult.status !== 100) {
          return res.status(400).send({
            code: 400,
            data: 'Invalid Portal'
          });
        }

        url = zarinpalResult.url;
        authority = zarinpalResult.authority;
      }

      payment.authority = authority;

      await getRepository(Payment).save(payment);
      await getRepository(Order).update({ id: orderObj.id }, { paymentId: payment.id });

      sms.sendPortal(
        orderObj.user.name + ' ' + orderObj.user.lastName,
        payment.finalPrice.toString(),
        url,
        orderObj.user.phoneNumber
      );

      return res.status(200).send({
        code: 200,
        data: {
          url: url,
          authority: authority
        }
      });
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Payment gateway error'
      });
    }
  };

  static assign = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { workerId } = req.body;

    let order: Order;

    try {
      order = await this.orders().findOneOrFail({
        where: { id: Number(id) },
        relations: ['service', 'user', 'worker', 'orderServices', 'address'],
        select: {
          id: true,
          code: true,
          date: true,
          fromTime: true,
          toTime: true,
          workerId: true,
          status: true,
          service: {
            id: true,
            title: true
          },
          user: {
            id: true,
            name: true,
            phoneNumber: true,
            isBlockSMS: true
          },
          worker: {
            id: true,
            name: true,
            lastName: true,
            phoneNumber: true
          },
          orderServices: {
            id: true,
            service: {
              id: true,
              title: true
            }
          },
          address: {
            id: true,
            description: true
          }
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
    }

    try {
      await this.assignOrder(order, workerId, true);

      return res.status(200).send({
        code: 200,
        data: order
      });
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: e.message
      });
    }
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      const result = await getRepository(Order).delete({ id: Number(id) });

      if (result.affected === 0) {
        return res.status(400).send({
          code: 400,
          data: 'Order not found'
        });
      }

      return res.status(200).send({
        code: 200,
        data: 'Successful'
      });
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
    }
  };

  static feedback = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      const feedback = await getRepository(Feedback).findOneOrFail({
        where: { orderId: Number(id) },
        relations: { feedbackFactors: true }
      });

      return res.status(200).send({
        code: 200,
        data: feedback
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        code: 400,
        data: 'Feedback not found'
      });
    }
  };

  static getRelatedWorkers = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const {
      attributes,
      fromTime: reqFromTime,
      toTime: reqToTime,
      address,
      date: dueDate
    } = req.body;

    let order: Order, district: District, orderServices: OrderService[], fromTime: number, toTime: number, date: string;

    if (id) {
      try {
        order = await this.orders().findOneOrFail({
          where: { id: Number(id) },
          relations: ['orderServices', 'address.district'],
          select: {
            id: true,
            fromTime: true,
            toTime: true,
            date: true,
            orderServices: {
              id: true,
              serviceId: true
            },
            address: {
              id: true,
              latitude: true,
              longitude: true,
              district: {
                id: true,
                code: true
              }
            }
          }
        });

        orderServices = order.orderServices;
        district = order?.address?.district;
        fromTime = order?.fromTime;
        toTime = order?.toTime;
        date = order?.date;
      } catch (error) {
        console.log(error);
        return res.status(400).send({
          code: 400,
          data: 'Invalid Order'
        });
      }
    } else {
      orderServices = attributes;
      fromTime = reqFromTime;
      toTime = reqToTime;
      date = dueDate;

      if (address) {
        if (address.districtId) {
          district = address.districtId;
        } else {
          const { lat, lng } = req.query;
          try {
            const result = await axios.get('https://api.neshan.org/v5/reverse', {
              params: { lat, lng },
              headers: { 'Api-Key': 'service.6e9aff7b5cd6457dae762930a57542a0' },
              timeout: 5000
            });
            district = result.data?.municipality_zone;
          } catch (e) {
            console.log('Location API error:', e);
          }
        }
      }
    }

    // Get busy workers using optimized query
    const busyWorkerIds = await getRepository(WorkerOffs)
    .createQueryBuilder('wo')
    .select('DISTINCT wo.userId', 'userId')
    .where('wo.date = :date', { date })
    .andWhere(
      '(wo.fromTime >= :fromTime AND wo.toTime < :toTime) OR ' +
      '(wo.fromTime <= :fromTime AND wo.toTime > :toTime) OR ' +
      '(wo.fromTime <= :fromTime AND wo.toTime > :fromTime) OR ' +
      '(wo.fromTime < :toTime AND wo.toTime > :toTime)',
      { fromTime, toTime }
    )
    .getRawMany();

    const busyIds = busyWorkerIds.map(w => w.userId);
    const requiredServiceIds = orderServices?.map(e => e.serviceId);

    // Optimized worker query
    const potentialWorkers = await this.users()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.services', 'services')
    .where('user.role = :role', { role: roles.WORKER })
    .andWhere('user.status = 1')
    .andWhere('services.id IN (:...serviceIds)', { serviceIds: requiredServiceIds })
    .andWhere(busyIds.length > 0 ? 'user.id NOT IN (:...busyIds)' : '1=1', busyIds.length > 0 ? { busyIds } : {})
    .select(['user.id', 'user.name', 'user.lastName'])
    .addSelect(['services.id'])
    .getMany();

    // Filter for exact service matches
    const availableWorkers = potentialWorkers.filter(worker =>
      requiredServiceIds.every(serviceId =>
        worker.services.some(service => service.id === serviceId)
      )
    );

    if (availableWorkers.length === 0) {
      return res.status(200).send({
        code: 200,
        data: {
          availableWorkers: [],
          suggestedWorkers: [],
          data: null
        }
      });
    }

    // Get suggested workers with recent jobs
    const suggestedWorkers: any = await getRepository(User)
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.jobs', 'jobs', 'jobs.date = :date AND jobs.fromTime < :fromTime AND jobs.fromTime >= :minTime', {
      date,
      fromTime,
      minTime: fromTime - 2
    })
    .leftJoinAndSelect('jobs.address', 'jobAddress')
    .where('user.id IN (:...ids)', { ids: availableWorkers.map(w => w.id) })
    .select(['user.id', 'user.name', 'user.lastName'])
    .addSelect(['jobs.id', 'jobs.date', 'jobs.fromTime'])
    .addSelect(['jobAddress.latitude', 'jobAddress.longitude'])
    .getMany();

    let response: any = {};

    // Calculate distances for workers with nearby jobs (limit API calls)
    if (id && order) {
      const workersWithJobs = suggestedWorkers.filter(w => w.jobs && w.jobs.length > 0);

      for (const worker of workersWithJobs.slice(0, 5)) { // Limit to 5 API calls
        const closeOrder = worker.jobs[0];
        if (closeOrder?.address) {
          try {
            const distanceResult = await axios.get(`https://api.neshan.org/v1/distance-matrix/no-traffic`, {
              params: {
                type: 'car',
                origins: `${closeOrder.address.latitude},${closeOrder.address.longitude}`,
                destinations: `${order.address.latitude},${order.address.longitude}`,
              },
              headers: { 'Api-Key': 'service.6e9aff7b5cd6457dae762930a57542a0' },
              timeout: 5000
            });

            const workerIndex = suggestedWorkers.findIndex(w => w.id === worker.id);
            if (workerIndex !== -1 && distanceResult.data?.rows?.[0]?.elements?.[0]) {
              suggestedWorkers[workerIndex] = {
                ...suggestedWorkers[workerIndex],
                approximatedDistance: distanceResult.data.rows[0].elements[0].distance,
                approximatedTime: distanceResult.data.rows[0].elements[0].duration
              };
            }
          } catch (e) {
            console.log('Distance calculation error for worker:', worker.id);
          }
        }
      }
    }

    return res.status(200).send({
      code: 200,
      data: {
        availableWorkers: availableWorkers.map(w => ({ id: w.id, name: w.name, lastName: w.lastName })),
        suggestedWorkers: suggestedWorkers.map(w => {
          const { jobs, ...rest } = w;
          return rest;
        }),
        data: response.data
      }
    });
  };

  private static assignOrder = async (order: Order, workerId: number, shouldSendSms: boolean) => {
    let worker: User;

    if (order.workerId && order.workerId != workerId) {
      sms.orderAssignWorkerChange(
        order.worker.name + ' ' + order.worker.lastName,
        order.code,
        order.worker.phoneNumber
      );

      await getRepository(WorkerOffs).delete({
        userId: order.workerId,
        orderId: order.id
      });
    }

    try {
      worker = await AdminOrderController.users().findOneOrFail({
        where: { id: workerId },
        select: ['id', 'name', 'lastName', 'phoneNumber', 'percent']
      });
    } catch (error) {
      throw new Error('Invalid Worker');
    }

    order.workerId = Number(workerId);
    order.worker = worker;
    order.status = orderStatus.Assigned;
    order.workerPercent = worker.percent;

    const errors = await validate(order);
    if (errors.length > 0) {
      throw new Error(errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; '));
    }

    try {
      await AdminOrderController.orders().save(order);

      if (shouldSendSms) {
        if (!order.user.isBlockSMS) {
          sms.orderAssignUser(
            order.user.name,
            worker.name,
            order.user.phoneNumber,
            order.date,
            order.fromTime.toString()
          );
        }

        const servicesTitles = order.orderServices?.map(os => os.service.title).join('-') || '';
        sms.orderAssignWorker(
          worker.name + ' ' + worker.lastName,
          servicesTitles,
          order.address.description,
          worker.phoneNumber,
          order.date,
          order.fromTime.toString()
        );
      }

      await getRepository(WorkerOffs).insert({
        fromTime: order.fromTime - 1,
        toTime: order.toTime + 1,
        orderId: order.id,
        userId: workerId,
        date: order.date
      });
    } catch (e) {
      console.log(e);
      throw new Error('Error trying to submit');
    }
  };
}

export default AdminOrderController;