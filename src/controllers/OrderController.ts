import axios from 'axios';
import { isArray, validate } from 'class-validator';
import { lookup } from 'dns';
import { Request, Response } from 'express';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import moment from 'jalali-moment';
import { getRepository, getTreeRepository, In } from 'typeorm';
import ZarinPalCheckout from 'zarinpal-checkout';
import { Address } from '../entity/Address';
import { Color } from '../entity/Color';
import { Discount } from '../entity/Discount';
import { Order } from '../entity/Order';
import { OrderService } from '../entity/OrderService';
import { OrderServiceAddOn } from '../entity/OrderServiceAddOn';
import { Package } from '../entity/Package';
import { Payment } from '../entity/Payment';
import { Service } from '../entity/Service';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, orderStatus, roles } from '../utils/enums';
import { decryptVectors, generateCode, getUniqueOrderCode, getUniqueSlug, jwtDecode, omit } from '../utils/funs';
import Media from '../utils/media';
import sms from '../utils/sms';

const { networkInterfaces } = require('os');

class OrderController {

  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static services = () => getRepository(Service);
  static addresses = () => getRepository(Address);
  static workerOffs = () => getRepository(WorkerOffs);
  static discounts = () => getRepository(Discount);
  static index = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
      });``
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
          relationLoadStrategy: 'query',
          where: {
            workerId: user.id
          },
          relations: ['orderServices.colors', 'orderServices.media', 'service', 'address', 'worker.profilePic', 'orderServices.addOns.addOn']
        });
      } else {
        orders = await this.orders().find({
          relationLoadStrategy: 'query',
          where: {
            userId: user.id,
            inCart: false,
          },
          relations: ['orderServices', 'service', 'address', 'worker', 'worker.profilePic', 'orderServices.addOns.addOn']
        });
      }
    } catch (e) {
      console.log(e);
      res.status(400).send({
        code: 400,
        data: 'Unexpected Error'
      });
    }

    for (let i = 0; i < orders.length; i++) {
      if (!orders[i].showUser) {
        delete orders[i].price;
        delete orders[i].finalPrice;
      }
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
    if ((!isUrgent ? date == moment().format('jYYYY/jMM/jDD') || (date == moment().add(1, 'd').format('jYYYY/jMM/jDD') && Number(moment().add(24, 'h').format('HH')) > time) : false) ||
      (date == '1403/12/30') ||
      (date == '1403/12/29') ||
      (date == moment().format('jYYYY/jMM/jDD') && Number(moment().format('HH')) > (time - 5)) ||
      (date == moment().add(1, 'd').format('jYYYY/jMM/jDD') && Number(moment().format('HH')) >= 16 && Number(moment().format('HH')) < 18 && time < 10) ||
      (date == moment().add(1, 'd').format('jYYYY/jMM/jDD') && Number(moment().format('HH')) >= 18 && time < 12)) {
      res.status(400).send({
        code: 1020,
        data: 'Invalid Date'
      });
      return;
    }

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

      if (discountObj.serviceId && (discountObj.serviceId != serviceObj.id)) {
        return res.status(400).send({
          code: 1012,
          data: 'Invalid Discount Service'
        });
      }
      if (moment().unix() > moment(discountObj.createdAt).add(discountObj.expirationDay, 'day').unix()) {
        return res.status(400).send({
          code: 1013,
          data: 'Discount Expired'
        });
      }


      if (await getRepository(Order).findOne({ where: { userId: Number(userId), discountId: discountObj.id } })) {
        return res.status(400).send({
          code: 1014,
          data: 'Invalid discount User'
        });
      }

      await this.discounts().update({ id: discountObj.id }, { timesUsed: discountObj.timesUsed + 1 });
    }

    let transportation = 200000;

    let totalPrice = 0, sections = 0;
    const order = new Order();
    for (const attr of attributeObjs) {
      totalPrice += (attr.price * (isUrgent ? 1.5 : 1) * (Number(attributes[attr.id].count) || 1));
      sections += attr.section;
      if (attributes[attr.id].addOns) {
        for (const [key, value] of Object.entries(attributes[attr.id].addOns)) {
          const addOnObj = await getRepository(Service).findOneBy({ id: Number(key) });
          totalPrice += (addOnObj.price * (isUrgent ? 1.5 : 1) * Number((value as any).count));
          sections += addOnObj.section;
        }
      }
    }
    order.price = totalPrice;
    if (discountObj && (discountObj.amount || discountObj.percent)) {
      const discountAmount = discountObj.percent ? (totalPrice * discountObj.percent / 100) : discountObj.amount;
      order.discountId = discountObj.id;
      order.discountAmount = discountAmount;
      totalPrice -= discountAmount;
    }

    if (totalPrice < 500000){
      return res.status(400).send({
        code: 1016,
        data: 'Under Price Limit'
      });
    }

    order.transportation = transportation;
    totalPrice += transportation;



    order.finalPrice = totalPrice;
    order.service = serviceObj;
    order.isUrgent = isUrgent;
    order.isWebsite = true;
    order.user = user;
    order.status = orderStatus.Created;
    order.address = addressObj;
    order.date = date;
    order.fromTime = time;
    order.toTime = Number(time) + sections / 4;

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
      order.workerPercent = worker?.percent;
    }

    const errors = await validate(order);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    try {
      await this.orders().save(order);
      const newOrderServices: OrderService[] = [];
      await Promise.all(attributeObjs.map(async (attr) => {
        const orderService = new OrderService();
        orderService.orderId = order.id;
        orderService.serviceId = attr.id;
        orderService.count = attributes[attr.id]?.count || 1;
        orderService.service = await getRepository(Service).findOneBy({ id: attr.id });
        orderService.price = attr.price * (isUrgent ? 1.5 : 1) * Number(attributes[attr.id]?.count || 1);
        orderService.singlePrice = attr.price * (isUrgent ? 1.5 : 1);
        orderService.pinterest = attributes[attr.id]?.pinterest;
        if (attributes[attr.id]?.colors?.length > 0) {
          orderService.colors = await getRepository(Color).find({ where: { slug: In(attributes[attr.id]?.colors) } });
        }

        await getRepository(OrderService).save(orderService);
        if (attributes[attr.id]?.addOns) {
          for (const [key, value] of Object.entries(attributes[attr.id]?.addOns)) {
            const addOnObj = await getRepository(Service).findOneBy({ id: Number(key) });
            const orderServiceAddOn = new OrderServiceAddOn();
            orderServiceAddOn.orderServiceId = orderService.id;
            orderServiceAddOn.addOnId = Number(key);
            orderServiceAddOn.count = Number((value as any)?.count) || 1;
            orderServiceAddOn.singlePrice = addOnObj.price;
            orderServiceAddOn.price = orderServiceAddOn.singlePrice * orderServiceAddOn.count;

            await getRepository(OrderServiceAddOn).save(orderServiceAddOn);

            const addOnOrderService = new OrderService();
            addOnOrderService.orderId = order.id;
            addOnOrderService.serviceId = Number(key);
            addOnOrderService.count = Number((value as any)?.count) || 1;
            addOnOrderService.service = addOnObj;
            addOnOrderService.isAddOn = true;
            addOnOrderService.price = addOnObj.price * (isUrgent ? 1.5 : 1) * Number((value as any)?.count);
            addOnOrderService.singlePrice = addOnObj.price * (isUrgent ? 1.5 : 1);
            // if (attributes[attr.id]?.colors?.length > 0) {
            //   orderService.colors = await getRepository(Color).find({ where: { slug: In(attributes[attr.id]?.colors) } });
            // }
            await getRepository(OrderService).save(addOnOrderService);

          }
        }

        newOrderServices.push(orderService);
      }));
      order.orderServices = newOrderServices;
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
    // sms.feedback(orderObj.user.name, orderObj.user.phoneNumber, orderObj.code);

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
      relationLoadStrategy: 'query',
      where: {
        userId: user.id,
        inCart: true
      },
      relations: {
        service: true,
        orderServices: { addOns: { addOn: true } },
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
    const {
      isCredit,
      method
    } = req.body;
    let user, orderObj, url, authority, payment: Payment, creditUsed = 0;
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

    for (const order of orders) {
      if (moment(moment().subtract(1, 'hour')).diff(order.createdAt, 'hour', true) > 1){
        await getRepository(Order).delete({ id: In(orders.map(e => e.id)) });
        return res.status(400).send({
          code: 1015,
          data: 'Invalid Time'
        });
      }
    }

    let finalPrice: any = orders.reduce<number>((acc, curr) => acc + curr.finalPrice, 0);

    try {
      payment = await getRepository(Payment).findOneBy({
        orders: {
          id: In(orders.map(e => e.id))
        }
      });

      if (!payment) {
        payment = new Payment();
      }
      payment.price = finalPrice;
      payment.method = method;
      payment.randomCode = await getUniqueSlug(getRepository(Payment), generateCode(8), 'randomCode');
      if (isCredit) {
        creditUsed = user.walletBalance > finalPrice ? finalPrice : user.walletBalance;
        payment.authority = payment.randomCode;
      }

      payment.finalPrice = finalPrice - creditUsed;
      payment.credit = creditUsed;

      await getRepository(Payment).save(payment);
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Payment'
      });
    }
    if (isCredit && finalPrice == creditUsed){
      url = `https://app.nilman.co/payment/verify?State=OK&Authority=${payment.authority}`;
    } else if (method == 'sep') {
      try{
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
          Amount: payment.finalPrice * 10,
          ResNum: generateCode(8, dataTypes.number),
          RedirectUrl: 'https://app.nilman.co/payment/verify',
          CellNumber: user.phoneNumber
        });
        console.log(sepReq.data);
        console.log(sepReq);
        authority = sepReq.data.token;
        url = `https://sep.shaparak.ir/OnlinePG/SendToken?token=${authority}`;
      } catch (e){
        console.log(e);
      }

    } else if (method == 'ap') {
      try {
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
          method: 'POST'
        });
        authority = apReq.data;
      } catch (e) {
        console.log('hiiiiiiiiii');
        console.log(e);
        console.log(e.response.data);
      }
    } else {
      const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
      const zarinpalResult = await zarinpal.PaymentRequest({
        Amount: payment.finalPrice, // In Tomans
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
      data: {
        url: url,
        authority: authority
      }
    });
  };
  static paymentVerify = async (req: Request, res: Response): Promise<Response> => {
    const {
      authority,
      status,
      refNum,
      terminalId,
      tranId
    } = req.body;

    let orders: Order[];
    let payment: Payment;
    let refId = null;
    let success = false;
    let decryptedValue = ',,,,,,';
    if (tranId) {
      decryptedValue = decryptVectors('jlQxyd+MtWbB4iRUAOVsrUm45zz/vFGzgn1atomY5lw=', 'ztPE0f1sZFtNn3C+7yEzB96+9bcr3/CqXpf3RgOTc9I=', authority);
    }
    try {
      orders = await this.orders().find({
        where: [{
          payment: { authority: authority }
        },
          {
            payment: { randomCode: decryptedValue.split(',')[1] }
          }
        ],
        relations: { user: true, orderServices: { service: { triggerPackage: true } }, service: true, address: true }
      });

      payment = await getRepository(Payment).findOne({
        where: [{
          authority: authority
        },
        {
          randomCode: decryptedValue.split(',')[1]
        }]
      });
    } catch (e) {
      console.log('no payment');
      return res.status(400).send({
        code: 400,
        data: 'Invalid Payment'
      });
    }
    try {
      if (payment.method == 'zarinpal') {
        const zarinpal = ZarinPalCheckout.create('f04f4d8f-9b8c-4c9b-b4de-44a1687d4855', false);
        const zarinpalRes = await zarinpal.PaymentVerification({
          Amount: payment.finalPrice,
          Authority: authority,
        }).then(function (response) {
          if (response.status == 101 || response.status == 100) {
            success = true;
            // @ts-ignore
            return response.RefID || response.refId;
          } else {
            console.log(response);
          }
        }).catch(function (err) {
          console.log(err);
          return res.status(400).send({
            code: 400,
            data: 'Invalid Portal'
          });
        });
        refId = zarinpalRes ? zarinpalRes.toString() : null;
      } else if (payment.method == 'sep') {
        const sepRes = await axios.post('https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction', {
          RefNum: refNum,
          terminalNumber: terminalId
        });
        success = sepRes.data.Success;
        refId = sepRes.data.TraceNo;
      } else if (payment.method == 'ap') {
        const apRes = await axios('https://ipgrest.asanpardakht.ir/v1/Verify', {
          headers:{
            usr: 'saln 5312721',
            pwd: 'MtK5786W'
          },
          data: {
            merchantConfigurationId: '270219',
            payGateTranId: decryptedValue.split(',')[5]
          },
          method: 'POST'
        });
        success = apRes.status == 200;
        refId = decryptedValue.split(',')[2];
      } else if(payment.method == 'credit'){
        success = true
      }

      if (!success) {
        throw new Error('Unsuccessful');
      }
    } catch (e) {
      console.log(e);
      console.log(e?.response);
      return res.status(400).send({
        code: 400,
        data: 'Invalid Portal'
      });
    }
    try {
      for (const order of orders) {
        order.inCart = false;
        order.status = order.workerId ? orderStatus.Assigned : orderStatus.Paid;
        if (!order.code) {
          order.code = await getUniqueOrderCode();
        }

        if (order.workerId){
          const worker = await getRepository(User).findOneBy({ id: order.workerId})
          await getRepository(WorkerOffs).insert({
            userId: order.workerId,
            orderId: order.id,
            fromTime: order.fromTime,
            toTime: order.fromTime == order.toTime ? order.fromTime + 2 : order.toTime,
            date: order.date
          })
          sms.orderAssignWorker(worker.name + ' ' + worker.lastName, order.orderServices?.reduce((acc, cur) => acc + '-' + cur.service.title, '').toString(), order.address.description, worker.phoneNumber, order.date, order.fromTime.toString());
          sms.orderAssignUser(order.user.name, worker.name, order.user.phoneNumber, order.date, order.fromTime.toString());
        }

        const triggeredOrderService = order.orderServices.find(e => e.service?.triggerPackage?.id)
        if (triggeredOrderService){
          const packageUsed = await getRepository(Package).findOne({
            where: { id: triggeredOrderService.service.triggerPackage.id },
            relations: { services: true, triggerService: true }
          });

          const newOrders: any = {}

          for (const newService of packageUsed.services) {
            const ancestors = await getTreeRepository(Service).findAncestors(newService);

            if (!newOrders[ancestors[0].id]) {
              newOrders[ancestors[0].id] = []
            }

            newOrders[ancestors[0].id].push(newService);
          }

          let firstAvailableHour = order.fromTime;

          for (const [key, value] of Object.entries(newOrders)) {
            const newOrder = new Order()
            newOrder.showUser = false;
            newOrder.serviceId = Number(key);
            newOrder.packageId = packageUsed.id
            newOrder.isWebsite = true;
            newOrder.transportation = 200000;
            newOrder.inCart = false;
            newOrder.status = orderStatus.Paid;
            newOrder.userId = order.userId;
            newOrder.addressId = order.addressId;
            newOrder.date = order.date
            newOrder.price = 0;
            newOrder.code = await getUniqueOrderCode();

            const newOrderServices = []

            let orderTime = 0;

            if (isArray(value)) {
              for (const newService of value as any) {
                const newOrderService = new OrderService()

                newOrderService.price = newService.price;
                newOrderService.singlePrice = newService.price;
                newOrderService.count = 1;
                newOrderService.serviceId = newService.id;

                newOrder.price += newService.price

                orderTime += (newService.section / 4)
                newOrderServices.push(newOrderService)
              }
            }

            newOrder.finalPrice = newOrder.price + newOrder.transportation;
            newOrder.fromTime = order.fromTime;
            newOrder.toTime = order.fromTime + orderTime;

            await getRepository(Order).save(newOrder)

            for (const newOrderService of newOrderServices) {
              newOrderService.orderId = newOrder.id

              await getRepository(OrderService).save(newOrderService)
            }
          }

          order.finalPrice = packageUsed.price
        }

        await getRepository(Order).save(order);

        if (!order.user.isBlockSMS) {
          sms.afterPaid(order.user.name, order.user.phoneNumber, order.date, order.fromTime.toString());
        }

        sms.notify(order.code, order.finalPrice.toString(), order.service.title.toString(), '09122251784');
      }
      await getRepository(Payment).update({ id: payment.id }, {
        isPaid: true,
        refId: refId
      });
      if (payment.credit > 0){
        const user = await getRepository(User).findOneBy({ id: Number(orders[0]?.userId) });

        user.walletBalance -= payment.credit;

        await getRepository(User).save(user);
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
    const userId = jwtDecode(req.headers.authorization);
    const { orderId } = req.body;
    console.log(orderId);
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
    if (orderObj.status != orderStatus.Created){
      return res.status(400).send({
        code: 1017,
        body: 'Invalid Order Status'
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
