import axios from 'axios';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Service } from '../entity/Service';

class HomeController {
  static services = () => getRepository(Service);

  static posts = async (req: Request, res: Response): Promise<Response> => {
    const categories = await axios('https://nilman.co/wp-json/wp/v2/categories');
    const data = await axios('https://nilman.co/wp-json/wp/v2/posts');
    const formattedData: any = [];

    for (const category of categories.data) {
      const object = category;

      for (const post of data.data.filter(e => e.categories.includes(object.id))) {
        if (!Array.isArray(object.posts)) {
          object.posts = [];
        }
        const medias = await axios(`https://nilman.co/wp-json/wp/v2/media?parent=${post.id}`);
        object.posts.push({
          title: post.title?.rendered,
          id: post.id,
          content: post.content?.rendered,
          date: post.date,
          summary: post.excerpt?.rendered,
          medias: medias.data.map(e => e.guid?.rendered),
          link: post.link,
        });
      }
      formattedData.push(object);
    }
    await Promise.all(categories.data.map(async j => {

      await Promise.all(data.data.filter(e => e.categories.includes(j.id)).map(async e => {

      }));

    }));

    return res.status(200).send({
      code: 200,
      data: formattedData
    });
  };

  static postCateogries = async (req: Request, res: Response): Promise<Response> => {
    const data = await axios('https://nilman.co/wp-json/wp/v2/categories');
    const formattedData = [];
    data.data.map(e => formattedData.push({
      id: e.id,
      title: e.title?.rendered,
      content: e.content?.rendered,
      date: e.date,
      summary: e.excerpt?.rendered,
      link: e.link,
    }));
    return res.status(200).send({
      code: 200,
      data: formattedData
    });
  };
}

export default HomeController;
