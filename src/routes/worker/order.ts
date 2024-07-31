import { Router } from "express";
import multer from 'multer';
import AuthController from "../../controllers/AuthController";
import WorkerOrderController from "../../controllers/worker/WorkerOrderController";
import multerConfig from '../../middlewares/multer';

export class WorkerOrderRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();


  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", this.authController.authorizeJWTWorker, WorkerOrderController.index);
    this.router.get("/single/:code", this.authController.authorizeJWTWorker ,WorkerOrderController.single);
    this.router.post("/status/start/:id", this.authController.authorizeJWTWorker ,WorkerOrderController.statusStart);
    this.router.post("/status/done/:id", multer(multerConfig('uploads/finalOrder')).any() ,WorkerOrderController.statusDone);
  }
}
