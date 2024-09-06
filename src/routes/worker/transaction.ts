import { Router } from "express";
import multer from 'multer';
import AuthController from "../../controllers/AuthController";
import WorkerTransactionController from "../../controllers/worker/WorkerTransactionController";
import multerConfig from '../../middlewares/multer';

export class WorkerTransactionRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();


  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", this.authController.authorizeJWTWorker, WorkerTransactionController.index);
  }
}
