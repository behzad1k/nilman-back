import { Request, Response } from "express";
import jwtDecode from 'jwt-decode';
import { getRepository, getTreeRepository } from 'typeorm';
import { Feedback } from '../entity/Feedback';
import {Service} from "../entity/Service";
import { getUniqueSlug } from '../utils/funs';
import sms from '../utils/smsLookup';

class FeedbackController {
  static feedbacks = () => getRepository(Feedback)

  static submit = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;

    const { orderId, rate, comment } = req.body;

    let feedback: Feedback = await getRepository(Feedback).findOneBy({ orderId: orderId });

    if (!feedback){
      feedback = new Feedback();
      feedback.userId = id;
      feedback.orderId = orderId;
    }

    feedback.rating = rate;
    feedback.description = comment;

    try {
      await getRepository(Feedback).save(feedback);
    } catch (e) {
      console.log(e);
      return res.status(409).send({
        code: 409,
        data: 'Something went wrong'
      })
    }

    return res.status(200).send({
      code: 200,
      data: feedback
    })
  }
}

export default FeedbackController;
