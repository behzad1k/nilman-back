import { Request, Response } from "express";
import { getRepository, In } from 'typeorm';
import { validate } from "class-validator";
import { Order } from "../../entity/Order";
import { Transaction } from "../../entity/Transaction";
import { User } from "../../entity/User";
import { getUniqueSlug } from "../../utils/funs";
import media from '../../utils/media';

class AdminTransactionController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static transactions = () => getRepository(Transaction)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const transactions = await this.transactions().find();
    return res.status(200).send({
      code: 200,
      data: transactions
    })
  }
  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    let transaction;
    try {
      transaction = await this.transactions().findOne({
        where: { id: Number(id)},
      });
    }catch (e){
      return res.status(400).send({
        code: 404,
        data: 'Transaction Not Found'
      })
    }
    return res.status(200).send({
      code: 200,
      data: transaction
    })
  }

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { date, amount, userId, description, code, orders } = req.body;
    let transactionObj: Transaction, worker: User;
    if (id) {
      try{
        transactionObj = await this.transactions().findOne({
          where: {
            id: Number(id)
          }
        });
      }catch (e){
        return res.status(400).send({
          code: 1002,
          data: 'Invalid Id'
        });
      }
    }else{
      transactionObj = new Transaction();
    }

    try{
      worker = await this.users().findOne({
        where: {
          id: Number(userId)
        }
      });
    }catch (e){
      return res.status(400).send({
        code: 1002,
        data: 'Invalid User'
      });
    }

    transactionObj.date = date;
    transactionObj.userId = userId;
    transactionObj.amount = amount;
    transactionObj.description = description;
    transactionObj.code = code;

    const errors = await validate(transactionObj);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.transactions().save(transactionObj);

      await this.orders().update({ id: In(orders)}, { transactionId: transactionObj.id })

      const newBalance = worker.walletBalance - transactionObj.amount;
      worker.walletBalance = newBalance < 0 ? 0 : newBalance;

      await this.users().save(worker)

    } catch (e) {
      console.log(e);
      res.status(409).send("error try again later");
      return;
    }
    return res.status(200).send({code: 200, data: transactionObj});
  };

  static medias = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let transaction;

    try {
      transaction = await this.transactions().findOneOrFail({ where: { id: Number(id) } });
    } catch (error) {
      return res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
    }

    if ((req as any).files[0]) {
      transaction.mediaId = await media.create(req, (req as any).files[0], transaction.code, '/public/uploads/transactions/');
    }

    try {
      await this.transactions().save(transaction);
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
    }

    return res.status(201).send({
      code: 200,
      data: transaction
    });
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    let transactionObj;
    try {
      transactionObj = await this.transactions().findOneOrFail({
        where: {
          id: Number(id)
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Id"});
      return;
    }
    try{
      await this.transactions().delete(transactionObj.id);

    }catch (e){
      console.log(e);
      res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: 'Successful'});
  };

}

export default AdminTransactionController;
