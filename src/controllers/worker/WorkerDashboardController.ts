import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { Between, getRepository, In, MoreThan } from 'typeorm';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { orderStatus } from '../../utils/enums';
import { getUniqueSlug, jwtDecode } from '../../utils/funs';
import smsLookup from '../../utils/smsLookup';

class WorkerDashboardController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static services = () => getRepository(Service)

  static salary = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    const { from, to } = req.query;
    const orders = await this.orders().find({
      where: {
        transactionId: MoreThan(0),
        workerId: Number(id),
        // @ts-ignore
        doneDate: Between(moment(from.toString(),'jYYYY-jMM-jDD-HH-ss').format('YYYY-MM-DD HH:ss'), moment(to.toString(),'jYYYY-jMM-jDD-HH-ss').format('YYYY-MM-DD HH:ss')),
      }
    });

    let total = 0;
    orders.map(e => total += ((e.price * e.workerPercent / 100) + e.transportation));

    return res.status(200).send({
      code: 200,
      data: { salary: total }
    })
  }
  static index = async (req: Request, res: Response): Promise<Response> => {
    const services = await this.services().find({
      relations: ['parent']
    });
    return res.status(200).send({
      code: 200,
      data: services
    })
  }
  static create = async (req: Request, res: Response): Promise<Response> => {
    const { title, description, price, parent, section, hasColor } = req.body;
    let parentObj;
    if (parent){
      try {
        parentObj = await this.services().findOne({
          where: {
            slug: parent
          }
        })
      }catch (e){
        return res.status(400).send({"code": 400, 'message': 'Invalid Parent'})
      }
    }
    const service = new Service();
    service.title = title;
    service.description = description;
    service.price = parseFloat(price);
    service.slug = await getUniqueSlug(this.services(),title)
    service.section = section
    // service.parentId = parentObj?.id || null
    if (hasColor)
      service.hasColor = hasColor
    const errors = await validate(service);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    try {
      await this.services().save(service);
    } catch (e) {
      res.status(409).send({"code": 409});
      return;
    }
    return res.status(201).send({ code: 201, data: service});
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { service } = req.body
    let serviceObj;
    try {
      serviceObj = await this.services().findOneOrFail({
        where: {
          slug: service
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Id"});
      return;
    }
    try{
      await this.services().delete(serviceObj.id);

    }catch (e){
      res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 204, data: 'Successful'});
  };


}

export default WorkerDashboardController;
