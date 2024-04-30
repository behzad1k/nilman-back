import axios from 'axios';
import { Request, Response } from "express";
import { getRepository, getTreeRepository } from 'typeorm';
import {Service} from "../entity/Service";
import { getUniqueSlug } from '../utils/funs';
import sms from '../utils/smsLookup';

class ServiceController {
  static services = () => getRepository(Service)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const services = await getTreeRepository(Service).findTrees();
    return res.status(200).send({
      code: 200,
      data: services
    })
  }
}

export default ServiceController;
