import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Order } from "../../entity/Order";
import { Color } from "../../entity/Color";
import { User } from "../../entity/User";
import { getUniqueSlug } from "../../utils/funs";
import media from '../../utils/media';

class AdminColorController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static colors = () => getRepository(Color)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const colors = await this.colors().find();
    return res.status(200).send({
      code: 200,
      data: colors
    })
  }
  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    let color;
    try {
      color = await this.colors().findOne({
        where: { id: Number(id)},
      });
    }catch (e){
      return res.status(400).send({
        code: 404,
        data: 'Color Not Found'
      })
    }
    return res.status(200).send({
      code: 200,
      data: color
    })
  }

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { title, description, code} = req.body;
    let colorObj: Color;
    if (id) {
      try{
        colorObj = await this.colors().findOne({
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
      colorObj = new Color();
      colorObj.slug = await getUniqueSlug(getRepository(Color), title)
    }
    if (title)
      colorObj.title = title;
    if (description)
      colorObj.description = description;
    if (code)
      colorObj.code = code;
    const errors = await validate(colorObj);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.colors().save(colorObj);
    } catch (e) {
      console.log(e);
      res.status(409).send("error try again later");
      return;
    }
    return res.status(200).send({code: 200, data: colorObj});
  };


  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    let colorObj;
    try {
      colorObj = await this.colors().findOneOrFail({
        where: {
          id: Number(id)
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Id"});
      return;
    }
    try{
      await this.colors().delete(colorObj.id);

    }catch (e){
      console.log(e);
      res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: 'Successful'});
  };

}

export default AdminColorController;
