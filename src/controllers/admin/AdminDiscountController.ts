import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Discount } from "../../entity/Discount";
import { Service } from '../../entity/Service';

class AdminDiscountController {
  static discounts = () => getRepository(Discount)
  
  static index = async (req: Request, res: Response): Promise<Response> => {
    const discounts = await this.discounts().find({ relations: { forUser: true }});
    return res.status(200).send({
      code: 200,
      data: discounts
    })
  }

  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let discount = null;
    try {
      discount = await this.discounts().findOneOrFail({
        where: { id: Number(id) },
        relations: {
          forUser: true
        }
      });
    } catch (error) {
      res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
      return;
    }
    return res.status(200).send({
      code: 200,
      data: discount
    });
  };

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { title, percent, amount, code, maxCount, forUserId, serviceId, expirationDay } = req.body;
    
    let discount: Discount;
    if (id) {
      try {
        discount = await this.discounts().findOneOrFail({ where: { id: Number(id) }});
      } catch (error) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid Id'
        });
      }
    }else{
      discount = new Discount();
      discount.active = true
    }

    discount.title = title;
    discount.expirationDay = expirationDay;
    discount.serviceId = serviceId;
    discount.percent = percent || 0;
    discount.amount = amount || 0;
    discount.code = code;
    discount.forUserId = forUserId;
    discount.maxCount = maxCount;

    const errors = await validate(discount);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.discounts().save(discount);
    } catch (e) {
      console.log(e);
      return res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: discount});
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    
    try{
      await this.discounts().delete({ id: Number(id) });
    }catch (e){
      return res.status(409).send({code: 409, data: "error try again later"});
    }
    return res.status(200).send({ code: 200, data: 'Successful'});
  };

}

export default AdminDiscountController;
