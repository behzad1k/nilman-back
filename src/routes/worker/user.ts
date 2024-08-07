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
    this.router.post("/emergency", this.authController.authorizeJWTWorker ,WorkerUserController.emergency);
    this.router.post("/workerOffs", this.authController.authorizeJWTWorker ,WorkerUserController.createWorkerOffs);
    this.router.get("/workerOffs", this.authController.authorizeJWTWorker ,WorkerUserController.workerOffs);
  }
}
