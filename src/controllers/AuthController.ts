import { NextFunction, Request, Response } from "express";
import * as jwt from 'jsonwebtoken';
import passport from "passport";
import "../middlewares/passport";
import config from '../config/config';
import { roles } from '../utils/enums';

export default class AuthController {
  public authenticateJWT(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate("jwt", (err, user) => {
      if (err) {
        return res.status(401).json({ status: "error", code: "401" });
      }
      try{
        jwt.verify(req.headers?.authorization?.split(' ')[1], config.jwtSecret)
      }catch (e){
        return res.status(401).send({
          code: 401,
          'message': 'Token Expired'
        });
      }
      if (!user.userId) {
        return res.status(401).json({ status: "error", code: "401" });
      } else {
        return next();
      }
    })(req, res, next);
  }
  public authorizeJWTAdmin(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate("jwt", (err, user) => {
      if (err) {
        return res.status(401).json({ status: "error", code: "401" });
      }
      if (!user) {
        return res.status(401).json({ status: "error", code: "401" });
      }
      try{
        jwt.verify(req.headers?.authorization?.split(' ')[1], config.jwtSecret)
      }catch (e){
        return res.status(401).send({
          code: 401,
          'message': 'Token Expired'
        });
      }
      if (user.role !== roles.SUPER_ADMIN && user.role !== roles.OPERATOR) {
        return res.status(403).json({ status: "error", code: "403" });
      } else {
        return next();
      }
    })(req, res, next);
  }
  public authorizeJWTWorker(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate("jwt", (err, user) => {
      if (err) {
        return res.status(401).json({ status: "error", code: "401" });
      }
      if (!user) {
        return res.status(401).json({ status: "error", code: "401" });
      }
      if (user.role !== roles.WORKER) {
        return res.status(403).json({ status: "error", code: "403" });
      } else {
        return next();
      }
    })(req, res, next);
  }
  public authorizeJWT(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate("jwt", (err, user, jwtToken) => {
      if (err) {
        return res.status(401).json({ status: "error", code: "unauthorized" });
      }
      if (!user) {
        return res.status(401).json({ status: "error", code: "unauthorized" });
      } else {
        const scope = req.baseUrl.split("/").slice(-1)[0];
        const authScope = jwtToken.scope;
        if (authScope && authScope.indexOf(scope) > -1) {
          return next();
        } else {
          return res.status(401).json({ status: "error", code: "unauthorized" });
        }
      }
    })(req, res, next);
  }
}
