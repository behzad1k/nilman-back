import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Discount } from "../../entity/Discount";
import { Service } from '../../entity/Service';

class AdminDiscountController {
  static discounts = () => getRepository(Discount)
  
  static index = async (req: Request, res: Response): Promise<Response> => {
    const discounts = this.discounts().find();
    return res.status(200).send({
      code: 200,
      data: discounts
    })
  }

  static create = async (req: Request, res: Response): Promise<Response> => {
    const { title, percent, amount, code, userId } = req.body;
    const discount = new Discount();
    if (percent && amount){
      return res.status(400).send({code: 400, data: 'Cant Have Both percent and amount'});
    }
    discount.title = title;
    discount.percent = percent;
    discount.code = code;
    discount.amount = amount;
    discount.userId = userId;
    const errors = await validate(discount);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    
    try {
      await this.discounts().save(discount);
    } catch (e) {
      return res.status(409).send({code: 409, data: "error try again later"});
    }
    return res.status(201).send({ code: 201, data: discount});
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const { id, title, percent, amount, code } = req.body;
    
    let discount: Discount;
    try {
      discount = await this.discounts().findOneOrFail(id);
    } catch (error) {
      return res.status(400).send({code: 400, data: "Invalid Id"});
    }
    if (title)
      discount.title = title;
    if (percent)
      discount.percent = percent;
    if (amount)
      discount.amount = amount;
    if (code)
      discount.code = code;
    const errors = await validate(discount);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.discounts().save(discount);
    } catch (e) {
      return res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 400, data: discount});
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const id: number = req.body.id
    
    try {
      await this.discounts().findOneOrFail({
        where: { id: id },
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Id"});
      return;
    }
    try{
      await this.discounts().delete(id);

    }catch (e){
      res.status(409).send({code: 409, data: "error try again later"});
    }
    return res.status(204).send();
  };

}

export default AdminDiscountController;
