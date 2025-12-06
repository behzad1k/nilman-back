import axios from 'axios';
import { Request, Response } from "express";
import { getRepository, getTreeRepository } from 'typeorm';
import {Service} from "../entity/Service";
import NodeCache from 'node-cache';

const serviceCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

class ServiceController {
  static services = () => getRepository(Service)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const { type } = req.query;
    const cacheKey = `services_${type || 'tree'}`;

    let services: Service[] = serviceCache.get(cacheKey);

    if (!services) {
      if (type == 'children'){
        services = await getRepository(Service).find({
          relations: { parent: true },
          select: ['id', 'title', 'slug', 'price', 'section', 'hasColor', 'hasMedia', 'isMulti', 'openDrawer', 'showInList', 'sort']
        });
      } else {
        services = await getTreeRepository(Service).findTrees({
          depth: 4,
          relations: ['media', 'parent', 'addOns', 'attributes']
        });
      }
      serviceCache.set(cacheKey, services);
    }

    return res.status(200).send({
      code: 200,
      data: services
    })
  }

  // Clear cache when services are modified
  static clearCache = () => {
    serviceCache.flushAll();
  }
}

export default ServiceController;