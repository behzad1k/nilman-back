import { Router } from "express";
import AuthController from "../controllers/AuthController";
import WorkerDashboardController from '../controllers/worker/WorkerDashboardController';
import { WorkerOrderRoutes } from './worker/order';

export class WorkerRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("/salary/:id",this.authController.authorizeJWTWorker, WorkerDashboardController.salary);
    this.router.use("/order",this.authController.authorizeJWTWorker, new WorkerOrderRoutes().router);
  }
}
