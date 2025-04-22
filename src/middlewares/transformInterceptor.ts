import { Request, Response, NextFunction } from 'express';
import { instanceToPlain } from 'class-transformer';

export default function transformInterceptor(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  console.log(res.json());
  if (JSON.stringify(originalJson)?.includes('user') || JSON.stringify(originalJson)?.includes('worker')){
    console.log('here');
    res.json = function(body) {
      body = instanceToPlain(body);
      return originalJson.call(this, body);
    };
  }
  next();
}
