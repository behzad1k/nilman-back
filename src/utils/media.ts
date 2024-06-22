import fs from 'fs';
import path from 'path';
import process from 'process';
import { getRepository } from 'typeorm';
import Media from '../entity/Media';
import { getUniqueSlug } from './funs';

const create = async (req, file, title, filePath) => {
  // path = '/public/uploads/banners/'
  const newName = await getUniqueSlug(getRepository(Media), title , 'title');
  const newUrl = 'https://' + req.get('host') + filePath + newName + path.parse(file.originalname).ext;
  const newPath = path.join(process.cwd(), filePath, newName + path.parse(file.originalname).ext);
  const oldPath = path.join(process.cwd(), file.path);

  fs.exists(oldPath, () => fs.rename(oldPath, newPath, (e) => console.log(e)));

  const media = new Media();

  media.size = file.size;
  media.title = title;
  media.originalTitle = file.originalname;
  media.mime = file.mimetype;
  media.path = newPath;
  media.url = newUrl;

  try {
    await getRepository(Media).save(media);
  }catch (e){
    console.log(e);
    return -1;
  }

  return media.id;
}

export default {
  create
}