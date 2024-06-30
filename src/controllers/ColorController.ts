import axios from 'axios';
import { Request, Response } from "express";
import { getRepository, getTreeRepository } from 'typeorm';
import {Color} from "../entity/Color";

class ColorController {
  static colors = () => getRepository(Color)

  static index = async (req: Request, res: Response): Promise<Response> => {
    let colors: Color[]
    colors = await getRepository(Color).find();
    return res.status(200).send({
      code: 200,
      data: colors
    })
  }
}

export default ColorController;
