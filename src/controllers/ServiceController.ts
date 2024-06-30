import axios from 'axios';
import { Request, Response } from "express";
import { getRepository, getTreeRepository } from 'typeorm';
import {Service} from "../entity/Service";

class ServiceController {
  static services = () => getRepository(Service)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const { type } = req.query;
    let services: Service[]
    if (type == 'children'){
      services = await getRepository(Service).find({ relations: { parent: true } });
    }else{
      services = await getTreeRepository(Service).findTrees({ depth: 4, relations: ['media', 'attributes', 'parent'] });
    }
    return res.status(200).send({
      code: 200,
      data: services
    })
  }
}

export default ServiceController;
