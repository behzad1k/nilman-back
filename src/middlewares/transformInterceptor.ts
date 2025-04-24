import { Request, Response, NextFunction } from 'express';
import { instanceToPlain } from 'class-transformer';
import { User } from '../entity/User';

export default function transformInterceptor(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;

  res.json = function(body) {
    try {
      if (!body) {
        return originalJson.call(this, body);
      }

      // Transform the entire response if it contains User instances
      const containsUserData = (obj: any): boolean => {
        if (!obj || typeof obj !== 'object') return false;

        // Check if it's a User instance
        if (obj instanceof User) return true;

        // Check if it's an array of Users
        if (Array.isArray(obj) && obj.length > 0 && obj[0] instanceof User) return true;

        // Check if it has a data property that might contain Users
        if (obj.data) return containsUserData(obj.data);

        // Check nested properties
        return Object.values(obj).some(val =>
          val && typeof val === 'object' && containsUserData(val)
        );
      };

      if (containsUserData(body)) {
        return originalJson.call(this, instanceToPlain(body));
      } else {
        return originalJson.call(this, body);
      }
    } catch (error) {
      console.error('Error in transform interceptor:', error);
      return originalJson.call(this, body);
    }
  };

  next();
}
