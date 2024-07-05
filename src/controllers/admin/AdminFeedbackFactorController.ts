import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { validate } from 'class-validator';
import Media from '../../entity/Media';
import { Order } from '../../entity/Order';
import { FeedbackFactor } from '../../entity/FeedbackFactor';
import { User } from '../../entity/User';
import { getUniqueSlug } from '../../utils/funs';
import media from '../../utils/media';

class AdminFeedbackFactorController {
  static users = () => getRepository(User);
  static orders = () => getRepository(Order);
  static feedbackFactors = () => getRepository(FeedbackFactor);

  static index = async (req: Request, res: Response): Promise<Response> => {
    const feedbackFactors = await this.feedbackFactors().find({
    });
    return res.status(200).send({
      code: 200,
      data: feedbackFactors
    });
  };
  static single = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let feedbackFactor;
    try {
      feedbackFactor = await this.feedbackFactors().findOne({
        where: { id: Number(id)},
      });
    }catch (e){
      return res.status(400).send({
        code: 404,
        data: 'FeedbackFactor Not Found'
      });
    }
    return res.status(200).send({
      code: 200,
      data: feedbackFactor
    });
  };

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { title, description, isPositive } = req.body;
    let feedbackFactorObj: FeedbackFactor;
    if (id) {
      try{
        feedbackFactorObj = await this.feedbackFactors().findOne({
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
      feedbackFactorObj = new FeedbackFactor();
      feedbackFactorObj.slug = await getUniqueSlug(getRepository(FeedbackFactor), title);
    }
    if (title)
      feedbackFactorObj.title = title;
    if (description)
      feedbackFactorObj.description = description;
    feedbackFactorObj.isPositive = isPositive;
    const errors = await validate(feedbackFactorObj);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await this.feedbackFactors().save(feedbackFactorObj);
    } catch (e) {
      console.log(e);
      res.status(409).send('error try again later');
      return;
    }
    return res.status(200).send({code: 200, data: feedbackFactorObj});
  };


  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let feedbackFactorObj;
    try {
      feedbackFactorObj = await this.feedbackFactors().findOneOrFail({
        where: {
          id: Number(id)
        }
      });
    } catch (error) {
      res.status(400).send({code: 400, data:'Invalid Id'});
      return;
    }
    try{
      await this.feedbackFactors().delete({ id: feedbackFactorObj.id });

    }catch (e){
      console.log(e);
      res.status(409).send('error try again later');
    }
    return res.status(200).send({code: 200, data: 'Successful'});
  };

}

export default AdminFeedbackFactorController;
