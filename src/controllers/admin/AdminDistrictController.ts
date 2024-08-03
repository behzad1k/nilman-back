import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { District } from "../../entity/District";
import { Service } from '../../entity/Service';

class AdminDistrictController {
  static districts = () => getRepository(District)
  
  static index = async (req: Request, res: Response): Promise<Response> => {
    const districts = await this.districts().find({ });
    return res.status(200).send({
      code: 200,
      data: districts
    })
  }

  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let district = null;
    try {
      district = await this.districts().findOneOrFail({
        where: { id: Number(id) },
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
      data: district
    });
  };

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { title, code, description } = req.body;
    
    let district: District;
    if (id) {
      try {
        district = await this.districts().findOneOrFail({ where: { id: Number(id) }});
      } catch (error) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid Id'
        });
      }
    }else{
      district = new District();
    }

    district.title = title;
    district.code = code;
    district.description = description;

    const errors = await validate(district);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.districts().save(district);
    } catch (e) {
      return res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: district});
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    
    try{
      await this.districts().delete({ id: Number(id) });
    }catch (e){
      return res.status(409).send({code: 409, data: "error try again later"});
    }
    return res.status(200).send({ code: 200, data: 'Successful'});
  };

}

export default AdminDistrictController;
