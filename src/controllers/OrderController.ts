import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import jwtDecode from 'jwt-decode';
import { getRepository, In } from 'typeorm';
import ZarinPalCheckout from 'zarinpal-checkout';
import { Address } from '../entity/Address';
import { Discount } from '../entity/Discount';
import { Order } from '../entity/Order';
import { OrderService } from '../entity/OrderService';
import { Payment } from '../entity/Payment';
import { Service } from '../entity/Service';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { orderStatus } from '../utils/enums';
import { omit } from '../utils/funs';
import smsLookup from '../utils/smsLookup';

class OrderController {

  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static services = () => getRepository(Service);
  static addresses = () => getRepository(Address);
  static workerOffs = () => getRepository(WorkerOffs);
  static discounts = () => getRepository(Discount);
  static index = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
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
      if (user.role === 'WORKER') {
        orders = await this.orders().find({
          where: {
            workerId: user.id
          },
          relations: ['orderServices', 'service', 'address', 'worker']
        });
      } else {
        orders = await this.orders().find({
          where: {
            userId: user.id,
            inCart: false
          },
          relations: ['orderServices', 'service', 'address', 'worker']
        });
      }
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
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
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

  static workers = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const {
      serviceId,
      addressId,
      section
    } = req.query;
    let user, service, address;
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
    try {
      service = await this.services().findOneOrFail({
        where: { id: Number(serviceId) },
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Service'
      });
      return;
    }
    try {
      address = await this.addresses().findOneOrFail({
        where: {
          id: Number(addressId),
          userId: user.id
        }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Address'
      });
      return;
    }

    const workers = await this.users().find({
      where: {
        serviceId: service.id,
        district: address.district
      },
      relations: ['workerOffs']
    });
    const nearest = await this.findFreeWorker(workers, parseInt(section?.toString()));
    return res.status(200).send({
      code: 200,
      data: {
        workers: workers,
        transportation: 100000,
        nearest: {
          date: nearest.date,
          workerId: nearest.worker
        }
      }
    });
  };
  static findFreeWorker = async (workers: User[], section: number) => {

    const allWorkerOffs = [];
    let nowHour = parseInt(moment().add(2, 'h').format('HH'));
    let nowDate = moment();
    if (nowHour >= 22) {
      nowHour = 8;
      nowDate = moment().add(1, 'd');
    }
    if (nowHour < 8)
      nowHour = 8;
    workers.map((worker) => allWorkerOffs.push(worker.workerOffs));
    let nearestDate = moment(), nearestTime = Number(nearestDate.format('HH')), nearestWorker;
    for (const worker of workers) {
      const userWorkOffs = worker.workerOffs.filter((value) => moment(parseInt(value.date)).format('jDD') === nowDate.format('jDD'));
      if (userWorkOffs.length == 0) {
        return {
          worker: worker.id,
          date: nowDate.format('jYYYY/jMM/jDD') + ' ' + nowHour + '-' + (nowHour + section)
        };
      }
      for (let nowHourTmp = (22 - section); nowHourTmp >= nowHour; nowHourTmp--) {
        for (const userWorkOff of userWorkOffs) {
          if (userWorkOff.fromTime <= nowHourTmp && userWorkOff.toTime > nowHourTmp) {
            nowHourTmp = userWorkOff.fromTime;
            continue;
          }

          if (userWorkOff.fromTime <= (nowHourTmp - section) && userWorkOff.toTime > (nowHourTmp - section)) {
            nowHourTmp = userWorkOff.fromTime;
            continue;
          }
          nearestTime = nowHourTmp - section;
          nearestDate = nowDate;
          nearestWorker = worker.id;
        }
      }
    }
    return {
      worker: nearestWorker,
      date: nearestDate.format('jYYYY/jMM/jDD') + ' ' + nearestTime + '-' + (nearestTime + section)
    };
  };

  static create = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const {
      service,
      attributes,
      date,
      time,
      addressId,
      workerId,
      discount
    } = req.body;
    let user, serviceObj, attributeObjs: Service[] = [], addressObj, worker, discountObj: Discount;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }
    try {
      serviceObj = await this.services().findOneOrFail({
        where: {
          slug: service
        }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Service'
      });
      return;
    }
    try {
      for (const value in attributes) {
        attributeObjs.push(
          await this.services().findOneOrFail({
            where: {
              slug: attributes[value],
            }
          })
        );
      }
    } catch (error) {
      console.log(error);
      res.status(400).send({
        code: 400,
        data: 'Invalid Attribute'
      });
      return;
    }

    try {
      addressObj = await this.addresses().findOneOrFail({
        where: {
          id: addressId,
          userId: user.id
        }
      });
    } catch (e) {
      return res.status(400).send({
        'code': 400,
        data: 'Invalid Address'
      });
    }

    if (discount) {
      try {
        discountObj = await this.discounts().findOneOrFail({ where: { code: discount } });
      } catch (error) {
        res.status(400).send({
          code: 1007,
          data: 'Invalid discount'
        });
        return;
      }

      if (!discountObj.active) {
        return res.status(400).send({
          code: 1008,
          data: 'Discount Not Active'
        });
      }

      if (discountObj.timesUsed > discountObj.maxCount) {
        return res.status(400).send({
          code: 1009,
          data: 'Discount Used Too Many Times'
        });
      }

      if ((discountObj.forUserId && discountObj.forUserId !== userId) || discount.userId == userId) {
        res.status(400).send({
          code: 1010,
          data: 'Invalid discount User'
        });
        return;
      }

      if (discountObj.code == user.code) {
        res.status(400).send({
          code: 1011,
          data: 'Invalid discount User'
        });
        return;
      }

      await this.discounts().update({ id: discountObj.id }, { timesUsed: discountObj.timesUsed + 1 });
    }

    // if (workerId) {
    //   try {
    //     worker = await this.users().findOneOrFail(workerId);
    //   } catch (error) {
    //     res.status(400).send({ code: 400, data: 'Invalid User' });
    //     return
    //   }
    // }else{
    //   try{
    //     worker = await this.users().findOneOrFail({});
    //   }
    //   catch (e){
    //     res.status(400).send({ code: 400, data: 'Invalid User' });
    //     return;
    //   }
    // }
    const transportation = 100000;
    let totalPrice = 0, sections = 0;
    const order = new Order();
    attributeObjs.map((attr) => {
      totalPrice += attr.price;
      sections += attr.section;
    });
    if (discountObj && (discountObj.amount || discountObj.percent)) {
      const discountAmount = discountObj.percent ? (totalPrice * discountObj.percent / 100) : discountObj.amount;
      order.discountId = discountObj.id;
      order.discountAmount = discountAmount;
      totalPrice -= discountAmount;
    }
    totalPrice += transportation;
    order.transportation = transportation;
    order.price = totalPrice;
    order.service = serviceObj;
    order.user = user;
    order.code = 'NIL-' + (10000 + await getRepository(Order).count());
    order.status = 'CREATED';
    order.address = addressObj;
    order.date = date;
    order.fromTime = time;
    order.toTime = Number(time) + sections;
    // order.worker = worker
    const errors = await validate(order);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    try {
      await this.orders().save(order);

      attributeObjs.map(async (attr) => {
        const orderService = new OrderService();
        orderService.orderId = order.id;
        orderService.serviceId = attr.id;
        orderService.price = attr.price;
        // orderService.colorId = attr.id;
        await getRepository(OrderService).save(orderService)
      })
        // const workerOff = new WorkerOffs();
      // workerOff.orderId = order.id;
      // workerOff.workerId = worker.id;
      // workerOff.date = order.date;
      // workerOff.fromTime = order.fromTime;
      // workerOff.toTime = order.toTime;
      // await this.workerOffs().save(workerOff);
    } catch (e) {
      console.log(e); //todo: delete order if workeroff not created
      res.status(409).send({ 'code': 409 });
      return;
    }
    const finalOrder = omit(['user', 'worker', 'service', 'address'], order);
    return res.status(201).send({
      code: 201,
      data: finalOrder
    });
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
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

  static cart = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid UserId'
      });
      return;
    }
    let orders = await this.orders().find({
      where: {
        userId: user.id,
        inCart: true
      },
      relations: [ 'service', 'address', 'orderServices']
    });
    return res.status(200).send({
      code: 200,
      data: orders
    });
  };

  static pay = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    let user, orderObj;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }

    let orders: Order[]

    try {
      orders = await this.orders().find({
        where: {
          inCart: true,
          userId: user.id
        },
      });

    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
    }

    const finalPrice: any = orders.reduce<number>((acc, curr) => acc + (curr.price - (curr.discountAmount || 0)), 0)
    const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
    const zarinpalResult = await zarinpal.PaymentRequest({
      Amount: finalPrice, // In Tomans
      CallbackURL: 'https://app.nilman.co/payment/verify',
      Description: 'A Payment from Node.JS',
      Email: 'info@nilman.co',
      Mobile: '09126000061'
    }).then(response => {
      if (response.status === 100) {
        return response;
      }
    }).catch(err => {
      console.error(err);
    });
    if (!zarinpalResult) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid Portal'
      });
    }

    try {
      let payment = await getRepository(Payment).findOneBy({ orders: {
          id: In(orders.map(e => e.id))
        } });
      if (!payment) {
        payment = new Payment();
      }
      payment.price = finalPrice;
      payment.authority = zarinpalResult.authority;
      await getRepository(Payment).save(payment);

      for (const order of orders) {
        await getRepository(Order).update({ id: order.id}, {paymentId: payment.id})
      }
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Payment'
      });
    }
    return res.status(200).send({
      code: 200,
      data: { url: zarinpalResult.url }
    });

  };
  static paymentVerify = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const {
      authority,
      status
    } = req.body;

    let user, orderObj;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }

    let orders: Order[];
    let payment: Payment;
    try {
      orders = await this.orders().find({
        where: {
          payment: { authority: authority }
        }
      });

      payment = await getRepository(Payment).findOne({
        where: {
          orders: { id: In(orders.map(e => e.id)) }
        }
      })
      const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
      const zarinpalRes = await zarinpal.PaymentVerification({
        Amount: payment.price,
        Authority: authority,
      }).then(function (response) {
        console.log(response);
        if (response.status == 101) {
          return response.RefID;
        } else {
          console.log(response);
        }
      }).catch(function (err) {
        console.log(err);
      });
      if (zarinpalRes) {
        for (const order of orders) {
          order.inCart = false;
          order.status = orderStatus.Paid;

          await getRepository(Order).save(order);
          smsLookup.afterPaid(user.name, user.phoneNumber, moment.unix(Number(order.date)).format('jYYYY/jMM/jDD'), order.fromTime.toString());
        }
        await getRepository(Payment).update({ id: payment.id }, {
          isPaid: true,
          refId: zarinpalRes
        });
      }
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
    }


    return res.status(200).send({
      code: 200,
      data: 'Successful'
    });

  };
  static delete = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const { orderId } = req.body;
    let user, orderObj;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
      return;
    }
    try {
      orderObj = await this.orders().findOneOrFail({ where: { id: Number(orderId) } });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid Order'
      });
      return;
    }
    if (user.id != orderObj.userId) {
      return res.status(403).send({
        code: 403,
        body: 'Access Forbidden'
      });
    }
    try {
      await this.orders().delete(orderObj.id);
    } catch (e) {
      return res.status(409).send('error try again later');
    }
    return res.status(200).send({ code: 200 });
  };
}

export default OrderController;
