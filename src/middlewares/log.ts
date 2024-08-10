import { getRepository } from 'typeorm';
import { Log } from '../entity/Log';
import { isEmpty, jwtDecode } from '../utils/funs';

const log = async (req, res, next) =>{
  const log = new Log();
  log.ipAddress = req.ip || req.socket.remoteAddress;
  log.pathname = req.originalUrl;
  log.userAgent = req.get('User-Agent');
  log.method = req.method;
  if (!isEmpty(req.body)){
    log.data = req.body.toString();
  }
  if (req.headers.authorization){
    log.userId = jwtDecode(req.headers.authorization);
  }

  try {
    await getRepository(Log).save(log);
  }catch (e){
    console.log(e);
  }
  next()
}
export default log;
