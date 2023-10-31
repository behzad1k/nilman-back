import { Request, Response } from "express";
import { now } from 'jalali-moment';
import moment from 'jalali-moment';
import jwtDecode from "jwt-decode";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Address } from "../entity/Address";
import { Discount } from '../entity/Discount';
import { Order } from "../entity/Order";
import { Service } from "../entity/Service";
import { User } from "../entity/User";
import { WorkerOffs } from '../entity/WorkerOffs';
import { orderStatus } from '../utils/enums';
import { getObjectValue, omit } from "../utils/funs";
import sms from '../utils/sms';

class OrderController {

  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static services = () => getRepository(Service)
  static addresses = () => getRepository(Address)
  static workerOffs = () => getRepository(WorkerOffs)
  static discounts = () => getRepository(Discount)
  static index = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const users = await this.users().find();
    let user;
    try {
      user = await this.users().findOneOrFail(userId);
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid User"});
      return;
    }
    let orders;
    try {
      if (user.role === 'WORKER') {
        orders = await this.orders().find({
          where: {
            workerId: user.id
          },
          relations: ['attributes', 'service', 'address', 'worker']
        })
      } else {
        orders = await this.orders().find({
          where: {
            userId: user.id,
            inCart: false
          },
          relations: ['attributes', 'service', 'address', 'worker']
        })
      }
    } catch (e){
      console.log(e);
      res.status(400).send({code: 400, data:"Unexpected Error"});
    }
    return res.status(200).send({
      code: 200,
      data: orders
    })
  }
  static workers = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const { serviceId, addressId, section } = req.query;
    let user, service, address;
    try {
      user = await this.users().findOneOrFail(userId);
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid User"});
      return;
    }
    try {
      service = await this.services().findOneOrFail(Number(serviceId));
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Service"});
      return;
    }
    try {
      address = await this.addresses().findOneOrFail(Number(addressId), {
        where: {
          userId: user.id
        }
      });
    } catch (error) {
      res.status(400).send({ code: 400, data:"Invalid Address" });
      return;
    }

    const workers = await this.users().find({
      where: {
        serviceId: service.id,
        district: address.district
      },
      relations: ['workerOffs']
    })
    const nearest = await this.findFreeWorker(workers, parseInt(section?.toString()));
    return res.status(200).send({ code: 200, data: {
        workers: workers,
        transportation: 100000,
        nearest:{
          date: nearest.date,
          workerId: nearest.worker
        }
    }})
  }
  static findFreeWorker = async (workers: User[], section: number) => {

    const allWorkerOffs = []
    let nowHour = parseInt(moment().add(2,'h').format('HH'))
    let nowDate = moment()
    if (nowHour >= 22) {
      nowHour = 8;
      nowDate = moment().add(1,'d')
    }
    if (nowHour < 8)
      nowHour = 8
    workers.map((worker) => allWorkerOffs.push(worker.workerOffs))
    let nearestDate = moment().add(1,'y'), nearestTime = 23, nearestWorker;
    for (const worker of workers) {
      const userWorkOffs = worker.workerOffs.filter((value) =>  moment(parseInt(value.date)).format('jDD') === nowDate.format('jDD'))
      if (userWorkOffs.length == 0){
        return { worker: worker.id, date: nowDate.format('jYYYY/jMM/jDD') + ' ' + nowHour + '-' + (nowHour + section)}
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
          nearestDate = nowDate
          nearestWorker = worker.id
        }
      }
    }
    return { worker: nearestWorker, date: nearestDate.format('jYYYY/jMM/jDD') + ' ' + nearestTime + '-' + (nearestTime + section)}
  }

  static create = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const { service, attributes, date, time, addressId, workerId, discount } = req.body;
    let user, serviceObj, attributeObjs: Service[] = [], addressObj, worker, discountObj;
    try {
      user = await this.users().findOneOrFail(userId);
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid User"});
      return;
    }
    try {
      serviceObj = await this.services().findOneOrFail({
        where: {
          slug: service
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Service"});
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
        )
      }
    } catch (error) {
      console.log(error);
      res.status(400).send({code: 400, data:"Invalid Attribute"});
      return;
    }

    try {
      addressObj = await this.addresses().findOneOrFail(addressId, {
        where: {
          userId: user.id
        }
      })
    }catch (e){
      return res.status(400).send({'code': 400, data: 'Invalid Address'})
    }

    if (discount) {
      try {
        discountObj = await this.discounts().findOneOrFail({where: {code: discount}})
      } catch (error) {
        res.status(400).send({ code: 400, data: 'Invalid discount' });
        return;
      }
      if (discountObj.userId && discountObj.userId !== userId){
        res.status(400).send({ code: 400, data: 'Invalid discount User' });
        return;
      }
    }

    if (workerId) {
      try {
        worker = await this.users().findOneOrFail(workerId);
      } catch (error) {
        res.status(400).send({ code: 400, data: 'Invalid User' });
        return;
      }
    }else{
      try{
        worker = await this.users().findOneOrFail();
      }
      catch (e){
        res.status(400).send({ code: 400, data: 'Invalid User' });
        return;
      }
    }
    const transportation = 100000
    let totalPrice = 0, sections = 0;
    const order  = new Order();
    attributeObjs.map((attr) => {
      totalPrice += attr.price;
      sections += attr.section;
    })
    if (discountObj && (discountObj.amount || discountObj.percent)){
      order.discountId = discountObj.id;
      totalPrice = discountObj.percent ? totalPrice - (totalPrice * discountObj.percent / 100) : totalPrice - discountObj.amount
    }
    totalPrice += transportation;
    order.attributes = attributeObjs
    order.price = totalPrice;
    order.service = serviceObj
    order.user = user
    order.status = 'CREATED'
    order.address = addressObj;
    order.date = date
    order.fromTime = time
    order.toTime = time + sections
    // order.worker = worker
    const errors = await validate(order);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    try {
      await this.orders().save(order);
      // const workerOff = new WorkerOffs();
      // workerOff.orderId = order.id;
      // workerOff.workerId = worker.id;
      // workerOff.date = order.date;
      // workerOff.fromTime = order.fromTime;
      // workerOff.toTime = order.toTime;
      // await this.workerOffs().save(workerOff);
    } catch (e) {
      console.log(e); //todo: delete order if workeroff not created
      res.status(409).send({"code": 409});
      return;
    }
    const finalOrder = omit(['user','worker','service','address'],order)
    return res.status(201).send({ code: 201, data: finalOrder});
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    let user, orderObj
    try {
      user = await this.users().findOneOrFail(userId);
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid User"});
      return;
    }
    const { orderId, done } = req.body;
    try {
      orderObj = await this.orders().findOneOrFail({
        where: {
          id: orderId,
          status: orderStatus.Assigned,
          workerId: user.id,
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Order"});
      return;
    }
    if (!done) {
      return res.status(400).send( {code: 400, data:"Invalid Status"})
    }

    orderObj.status = orderStatus.Done

    try {
      await this.orders().save(orderObj);
    } catch (e) {
      res.status(409).send("error try again later");
      return;
    }
    return res.status(200).send({code: 200, data: ""})
  }

  static cart = async (req: Request,res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail(id,{
        relations: ['orders']
      });
    }
    catch (error) {
      res.status(400).send({code: 400, data: "Invalid UserId"});
      return;
    }
    let orders = await this.orders().find({
      where: {
        userId: user.id,
        inCart: true
      },
      relations: ['attributes', 'service', 'address']
    })
    return res.status(200).send({code: 200, data: orders})
  }

  static pay = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    let user, orderObj
    try {
      user = await this.users().findOneOrFail(userId,{
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid User"});
      return;
    }
    try {
      user.orders.map((value: Order) => {
        this.orders().update(value.id, {
          inCart: false,
          status: orderStatus.Paid
        })
      })
      // send sms here
      return res.status(200).send({code: 200, data: ''})
    }catch (e){
      console.log(e)
      res.status(409).send({code: 409, data:"error try again later"});
    }
  }
  static delete = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const {orderId} = req.body;
    let user, orderObj
    try {
      user = await this.users().findOneOrFail(userId,{
        relations: ['orders']
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid User"});
      return;
    }
    try {
      orderObj = await this.orders().findOneOrFail(orderId)
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Order"});
      return;
    }
    if (user.id != orderObj.userId){
      return res.status(403).send({code: 403, body: "Access Forbidden"})
    }
    try{
      await this.orders().delete(orderObj.id);
    }catch (e){
      return res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200})
  }
}

export default OrderController;
