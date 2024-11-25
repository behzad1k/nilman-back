import axios from 'axios';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { getRepository, In } from 'typeorm';
import ZarinPalCheckout from 'zarinpal-checkout';
import { Address } from '../entity/Address';
import { Color } from '../entity/Color';
import { Discount } from '../entity/Discount';
import { Order } from '../entity/Order';
import { OrderService } from '../entity/OrderService';
import { Payment } from '../entity/Payment';
import { Service } from '../entity/Service';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, orderStatus, roles } from '../utils/enums';
import { generateCode, jwtDecode, omit } from '../utils/funs';
import Media from '../utils/media';
import smsLookup from '../utils/smsLookup';
const { networkInterfaces } = require('os');
import { lookup } from 'dns';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
class OrderController {

  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static services = () => getRepository(Service);
  static addresses = () => getRepository(Address);
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
      if (user.role === 'WORKER') {
        orders = await this.orders().find({
          where: {
            workerId: user.id
          },
          relations: ['orderServices.colors', 'orderServices.media', 'service', 'address', 'worker']
        });
      } else {
        orders = await this.orders().find({
          where: {
            userId: user.id,
            inCart: false
          },
          relations: ['orderServices', 'service', 'address', 'worker', 'worker.profilePic']
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

  static workers = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
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
        // serviceId: service.id,
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

  static deleteCartService = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const userId = jwtDecode(req.headers.authorization);
    try {
      const order = await getRepository(Order).findOneOrFail({
        where: {
          userId: userId,
          inCart: true,
          orderServices: { id: Number(id) }
        },
        relations: { orderServices: true }
      });
      if (order.orderServices?.length == 1) {
        await getRepository(Order).delete({ id: order.id });
      } else {
        await getRepository(OrderService).delete({
          id: Number(id),
          order: {
            inCart: true
          }
        });
      }
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 409,
        data: 'Something went wrong'
      });
    }
    return res.status(200).send({
      code: 200,
      data: 'Successful'
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
    const userId = jwtDecode(req.headers.authorization);
    const {
      service,
      attributes,
      date,
      time,
      addressId,
      workerId,
      discount,
      isUrgent
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
      attributeObjs = await this.services().find({
        where: {
          id: In(Object.keys(attributes)),
        }
      });
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

    const transportation = 100000;
    let totalPrice = 0, sections = 0;
    const order = new Order();
    attributeObjs.map((attr) => {
      totalPrice += (attr.price * (isUrgent ? 1.5 : 1));
      sections += attr.section;
    });
    if (discountObj && (discountObj.amount || discountObj.percent)) {
      const discountAmount = discountObj.percent ? (totalPrice * discountObj.percent / 100) : discountObj.amount;
      order.discountId = discountObj.id;
      order.discountAmount = discountAmount;
      totalPrice -= discountAmount;
    }
    order.transportation = transportation;
    order.price = totalPrice;
    totalPrice += transportation;
    order.finalPrice = totalPrice;
    order.service = serviceObj;
    order.isUrgent = isUrgent;
    order.user = user;
    order.status = orderStatus.Created;
    order.address = addressObj;
    order.date = date;
    order.fromTime = time;
    order.toTime = Number(time) + sections;

    if (workerId) {
      try {
        const pastOrders = await getRepository(Order).find({
          where: {
            workerId: workerId,
            userId: userId
          }
        });
        worker = await this.users().findOneOrFail({
          where: {
            status: 1,
            role: roles.WORKER,
            id: workerId
          }
        });
        // if ([worker].filter(e => Object.values(attributes)?.every(k => e.services?.map(e => e.id).includes(k))).length == 0 || !pastOrders.find(e => e.workerId == workerId)) {
        //   throw new Error('Worker Not Suitable');
        // }
      } catch (error) {
        console.log(error);
        res.status(400).send({
          code: 400,
          data: 'Invalid Worker'
        });
        return;
      }
      order.worker = worker;
      order.workerId = workerId;
      order.status = orderStatus.Assigned
      order.code = 'NIL-' + (10000 + await getRepository(Order).count({ where: { inCart: false }}));
    }

    const errors = await validate(order);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    try {
      await this.orders().save(order);
      const newOrderServices: OrderService[] = []
      await Promise.all(attributeObjs.map(async (attr) => {
        const orderService = new OrderService();
        orderService.orderId = order.id;
        orderService.serviceId = attr.id;
        orderService.service = await getRepository(Service).findOneBy({ id: attr.id });
        orderService.price = attr.price * (isUrgent ? 1.5 : 1);
        orderService.colors = await getRepository(Color).find({ where: { slug: In(attributes[attr.id]?.colors) } });
        orderService.pinterest = attributes[attr.id]?.pinterest;

        await getRepository(OrderService).save(orderService);

        newOrderServices.push(orderService);
      }));
      order.orderServices = newOrderServices;

      if (workerId){
        smsLookup.orderAssignWorker(order.orderServices?.reduce((acc, cur) => acc + '-' + cur.service.title, '').toString(), order.address.description, order.worker.phoneNumber, order.date, order.fromTime.toString());
        smsLookup.orderAssignUser(order.user.name, order.worker.name + ' ' + order.worker.lastName, order.user.phoneNumber, order.date, order.fromTime.toString());

      }
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

  static medias = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    const { id } = req.params;
    for (const media of (req as any).files) {
      const orderService = await getRepository(OrderService).findOne({
        where: {
          service: { id: media.fieldname.substring(6, media.fieldname.length - 1) },
          order: {
            id: Number(id),
            user: { id: Number(userId) }
          }
        },
        relations: {
          order: { user: true },
          service: true
        }
      });
      if (orderService) {
        orderService.mediaId = await Media.create(req, media, orderService.service.title + '-' + orderService.order.user.phoneNumber, '/public/uploads/order/');
        try {
          await getRepository(OrderService).save(orderService);
        } catch (e) {
          console.log(e);
          res.status(409).send({ 'code': 409 });
          return;
        }
      }
    }
    return res.status(200).send({
      code: 200,
      data: ''
    });
  };
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
    // smsLookup.feedback(orderObj.user.name, orderObj.user.phoneNumber, orderObj.code);

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
    const id = jwtDecode(req.headers.authorization);
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
      relations: {
        service: true,
        orderServices: true,
        address: true
      }
    });
    return res.status(200).send({
      code: 200,
      data: orders
    });
  };

  static pay = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    const { isCredit, method } = req.body
    let user, orderObj, url, authority;
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

    let finalPrice: any = orders.reduce<number>((acc, curr) => acc + curr.finalPrice, 0);
    if (isCredit){
      finalPrice = finalPrice - user.walletBalance
    }

    if (method == 'sep'){
      const serverIP = networkInterfaces.eth0?.[0].address;
      const axiosInstance = axios.create({
        proxy: false,
        httpAgent: new HttpAgent({
          localAddress: serverIP,
          lookup: lookup
        }),
        httpsAgent: new HttpsAgent({

          localAddress: serverIP,
          lookup: lookup
        })
      });

      const sepReq = await axiosInstance.post('https://sep.shaparak.ir/onlinepg/onlinepg', {
          action: 'token',
          TerminalId: 14436606,
          Amount: finalPrice * 10,
          // 86.55.191.52
          ResNum: generateCode(8, dataTypes.number),
          RedirectUrl: "https://app.nilman.co/payment/verify",
          CellNumber: user.phoneNumber
        })
      authority = sepReq.data.token

    }else{
      const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
      const zarinpalResult = await zarinpal.PaymentRequest({
        Amount: finalPrice, // In Tomans
        CallbackURL: 'https://app.nilman.co/payment/verify',
        Description: 'A Payment from Nilman',
        Mobile: user.phoneNumber
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
      url = zarinpalResult.url;
      authority = zarinpalResult.authority;
    }

    try {
      let payment = await getRepository(Payment).findOneBy({
        orders: {
          id: In(orders.map(e => e.id))
        }
      });
      if (!payment) {
        payment = new Payment();
      }
      payment.price = finalPrice;
      payment.method = method
      payment.authority = authority;

      await getRepository(Payment).save(payment);

      for (const order of orders) {
        await getRepository(Order).update({ id: order.id }, { paymentId: payment.id });
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
      data: { url: url, authority: authority }
    });

  };
  static paymentVerify = async (req: Request, res: Response): Promise<Response> => {
    // const userId = jwtDecode(req.headers.authorization);
    const {
      authority,
      status,
      refNum,
      terminalId
    } = req.body;

    let orders: Order[];
    let payment: Payment;
    let refId = null;
    let success = false;
    try {
      orders = await this.orders().find({
        where: {
          payment: { authority: authority }
        },
        relations: { user: true }
      });

      payment = await getRepository(Payment).findOne({
        where: {
          authority: authority
        }
      });
    }catch(e) {
      console.log('no payment');
      return res.status(400).send({
        code: 400,
        data: 'Invalid Payment'
      });
    }
    console.log(payment);
    try {
      if (payment.method == 'zarinpal') {
        const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
        const zarinpalRes = await zarinpal.PaymentVerification({
          Amount: payment.price,
          Authority: authority,
        }).then(function (response) {
          console.log(response);
          if (response.status == 101 || response.status == 100) {
            success = true
            return response.RefID;
          } else {
            console.log(response);
          }
        }).catch(function (err) {
          console.log(err);
        });
        refId = zarinpalRes ? zarinpalRes.toString() : null
      } else if (payment.method == 'sep') {
        const sepRes = await axios.post('https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction', {
          RefNum: refNum,
          terminalNumber: terminalId
        })
        success = sepRes.data.Success;
        refId = sepRes.data.TraceNo;
      }

      if (!success) {
        throw new Error('Invalid Portal')
      }
    }catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Portal'
      });
    }
    try{
      for (const order of orders) {
        order.inCart   = false;
        order.status = order.workerId ? orderStatus.Assigned : orderStatus.Paid;
        order.code = 'NIL-' + (10000 + await getRepository(Order).count({ where: { inCart: false }}));

        await getRepository(Order).save(order);
        smsLookup.afterPaid(order.user.name, order.user.phoneNumber, order.date, order.fromTime.toString());
        smsLookup.notify(order.code, order.finalPrice.toString(), order.orderServices?.reduce((acc, cur) => acc + '-' + cur.service.title, '').toString());
      }
      await getRepository(Payment).update({ id: payment.id }, {
        isPaid: true,
        refId: refId
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
      data: 'Successful'
    });

  };
  static delete = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
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
