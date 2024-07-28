import { Router } from "express";
import multer from 'multer';
import AuthController from "../../controllers/AuthController";
import WorkerUserController from "../../controllers/worker/WorkerUserController";

export class WorkerUserRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();


  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.post("/bank", this.authController.authorizeJWTWorker ,WorkerUserController.bankInfo);
  }
}
