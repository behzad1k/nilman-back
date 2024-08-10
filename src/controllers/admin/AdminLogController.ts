import { Request, Response } from "express";
import path from 'path';
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Log } from '../../entity/Log';
import { Order } from "../../entity/Order";
import { Color } from "../../entity/Color";
import { User } from "../../entity/User";
import { getUniqueSlug } from "../../utils/funs";
import media from '../../utils/media';

class AdminLogController {

  static index = async (req: Request, res: Response): Promise<Response> => {
    const { path } = req.query;
    const where = {};
    where['pathname'] = path.toString().replaceAll('%2', '/');

    const logs = await getRepository(Log).find({ where: where });
    return res.status(200).send({
      code: 200,
      data: logs
    })
  }

}

export default AdminLogController;
