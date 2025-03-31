import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import { Between, getRepository, In, IsNull, MoreThan, Not } from 'typeorm';
import { Order } from '../../entity/Order';
import { Service } from '../../entity/Service';
import { Transaction } from '../../entity/Transaction';
import { User } from '../../entity/User';
import { WorkerOffs } from '../../entity/WorkerOffs';
import { orderStatus } from '../../utils/enums';
import { getUniqueSlug, jwtDecode } from '../../utils/funs';
import sms from '../../utils/sms';

class WorkerDashboardController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static services = () => getRepository(Service)

  static salary = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    const { from, to } = req.query;

    const orders = await this.orders().find({
      where: {
        workerId: Number(id),
        status: orderStatus.Done,
        doneDate: Between(
          new Date(moment(from.toString(), 'jYYYY-jMM-jDD-HH-mm').locale('en').format('YYYY-MM-DD HH:mm')),
          new Date(moment(to.toString(), 'jYYYY-jMM-jDD-HH-mm').locale('en').format('YYYY-MM-DD HH:mm'))
        ),
      }
    });

    let total = 0;
    let totalProfit = 0;

    for (const dt of orders) {
      total += dt.finalPrice;
      totalProfit += ((dt.price * dt.workerPercent / 100) + dt.transportation);
    }

    return res.status(200).send({
      code: 200,
      data: {
        total: total,
        profit: totalProfit,
      }
    })
  }

  static chart = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    const result = []

    const orders = await this.orders().find({
      where: {
        workerId: Number(id),
        status: orderStatus.Done,
      },
      order: {
        doneDate: 'ASC'
      }
    });

    if (orders.length == 0) {
      return res.status(400).send({
        code: 400,
        data: {}
      });
    }
    moment.locale('fa', { useGregorianParser: true });
    let currMonth = moment(moment(orders[0].doneDate).format('jYYYY/jMM/jDD'), 'jYYYY/jMM/jDD').locale('fa');
    while (currMonth.isSameOrBefore(moment())){
      currMonth = currMonth.startOf('month');

      const firstPeriod = orders.filter(e => moment(e.doneDate).unix() >= currMonth.startOf('jmonth').unix() && moment(e.doneDate).unix() < currMonth.startOf('jmonth').add(15, 'day').unix());
      const secondPeriod = orders.filter(e => moment(e.doneDate).unix() >= currMonth.startOf('jmonth').add(15, 'day').unix() && moment(e.doneDate).unix() < currMonth.endOf('jmonth').unix());

      result.push({
        month: currMonth.locale('fa').format('jMMMM'),
        firstPeriodTotal: firstPeriod.reduce((acc, curr) => acc + curr.finalPrice, 0),
        firstPeriodProfit: firstPeriod.reduce((acc, curr) => acc + ((curr.price * curr.workerPercent / 100) + curr.transportation), 0),
        firstPeriodCount: firstPeriod.length,
        secondPeriodTotal: secondPeriod.reduce((acc, curr) => acc + curr.finalPrice, 0),
        secondPeriodProfit:secondPeriod.reduce((acc, curr) => acc + ((curr.price * curr.workerPercent / 100) + curr.transportation), 0),
        secondPeriodCount: secondPeriod.length,
      })

      currMonth = currMonth.endOf('month').add(1, 'day');
    }
    return res.status(200).send({
      code: 200,
      data: result
    })
  }
  static income = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);

    const orders = await this.orders().find({
      where: {
        workerId: Number(id),
        status: orderStatus.Done,
        transactionId: IsNull(),
      }
    });

    let total = 0;
    let totalProfit = 0;

    for (const dt of orders) {
      total = dt.finalPrice + total;
      totalProfit += ((dt.price * dt.workerPercent / 100) + dt.transportation);
    }

    const lastTransaction = await getRepository(Transaction).findOne({
      where: {},
      select: ['createdAt'],
      order: { createdAt: 'DESC'}
    })

    return res.status(200).send({
      code: 200,
      data: {
        total: total,
        profit: totalProfit,
        lastTransactionDate: moment(lastTransaction.createdAt).format('jYYYY/jMM/jDD')
      }
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
