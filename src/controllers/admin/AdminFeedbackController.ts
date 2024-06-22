import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import { Order } from "../../entity/Order";
import { Feedback } from "../../entity/Feedback";
import { User } from "../../entity/User";
import { getUniqueSlug } from "../../utils/funs";

class AdminFeedbackController {
  static users = () => getRepository(User)
  static orders = () => getRepository(Order)
  static feedbacks = () => getRepository(Feedback)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const feedbacks = await this.feedbacks().find({
      relations: { order: { worker: true, user: true } }
    });
    return res.status(200).send({
      code: 200,
      data: feedbacks
    })
  }

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params
    let feedbackObj;
    try {
      feedbackObj = await this.feedbacks().findOneOrFail({
        where: {
          id: Number(id)
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Id"});
      return;
    }
    try{
      await this.feedbacks().delete(feedbackObj.id);

    }catch (e){
      res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: 'Successful'});
  };

}

export default AdminFeedbackController;
