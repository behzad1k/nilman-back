import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Order } from "../../entity/Order";
import { Service } from "../../entity/Service";
import { User } from "../../entity/User";
import { getUniqueSlug } from "../../utils/funs";
import media from '../../utils/media';

class AdminServiceController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static services = () => getRepository(Service)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const services = await this.services().find({
      relations: ['parent']
    });
    return res.status(200).send({
      code: 200,
      data: services
    })
  }
  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    let service;
    try {
      service = await this.services().findOne({
        where: { id: Number(id)},
        relations: { media: true, parent: true }
      });
    }catch (e){
      return res.status(400).send({
        code: 404,
        data: 'Service Not Found'
      })
    }
    return res.status(200).send({
      code: 200,
      data: service
    })
  }
  static create = async (req: Request, res: Response): Promise<Response> => {
    const { title, description, price, parent, section, hasColor } = req.body;
    let parentObj = null;
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
    service.parent = parentObj

    if (hasColor)
      service.hasColor = hasColor
    const errors = await validate(service);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    console.log(service);
    try {
      await this.services().save(service);
    } catch (e) {
      console.log(e);
      res.status(409).send({"code": 409});
      return;
    }
    return res.status(201).send({ code: 201, data: service});
  };

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { title, description, price, section, hasColor, parentId } = req.body;
    let serviceObj: Service;
    if (id) {
      try{
        serviceObj = await this.services().findOne({
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
      serviceObj = new Service();
      serviceObj.slug = await getUniqueSlug(getRepository(Service), title)
    }
    console.log(serviceObj);
    if (title)
      serviceObj.title = title;
    if (description)
      serviceObj.description = description;
    if (price)
      serviceObj.price = parseFloat(price);
    if (parentId)
      serviceObj.parent = await getRepository(Service).findOneBy({ id: parentId});
    if (section)
      serviceObj.section = section
    if (hasColor != 'false')
      serviceObj.hasColor = hasColor
    const errors = await validate(serviceObj);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    //
    // if ((req as any).file) {
    //   serviceObj.mediaId = await media.create(req, (req as any).file, serviceObj.title, '/public/uploads/service/');
    // }
    try {
      await this.services().save(serviceObj);
    } catch (e) {
      console.log(e);
      res.status(409).send("error try again later");
      return;
    }
    return res.status(200).send({code: 200, data: serviceObj});
  };

  static medias = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let service;

    try {
      service = await this.services().findOneOrFail({ where: { id: Number(id) } });
    } catch (error) {
      return res.status(400).send({
        code: 1002,
        data: 'Invalid Id'
      });
    }
    console.log((req as any).files[0]);
    if ((req as any).files[0]) {
      service.mediaId = await media.create(req, (req as any).files[0], service.title, '/public/uploads/service/');
    }

    try {
      await this.services().save(service);
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'error try again later'
      });
    }

    return res.status(201).send({
      code: 200,
      data: service
    });
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
      console.log(e);
      res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: 'Successful'});
  };

}

export default AdminServiceController;
