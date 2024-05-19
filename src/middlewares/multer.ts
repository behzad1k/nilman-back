import multer from 'multer';
import * as path from 'path';
import uniqid from 'uniqid';

const imageStorage = (pathName: string) => multer.diskStorage({
  destination: 'public/' + pathName,
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '_' + uniqid()
      + path.extname(file.originalname))
  }
});

const multerConfig = (path: string) => {
  return {
  storage: imageStorage(path),
  limits: {
    fileSize: 8000000 // 1000000 Bytes = 1 MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|jpeg|xlsx|pdf)$/)) {
      return cb(new Error('Please upload a Image'))
    }
    cb(undefined, true)
  }
  }
}

export default multerConfig;
