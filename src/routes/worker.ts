import { Router } from "express";
import AuthController from "../controllers/AuthController";
import WorkerDashboardController from '../controllers/worker/WorkerDashboardController';
import { WorkerDashboardRoutes } from './worker/dashboard';
import { WorkerOrderRoutes } from './worker/order';
import { WorkerTransactionRoutes } from './worker/transaction';
import { WorkerUserRoutes } from './worker/user';

export class WorkerRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.use("/dashboard",this.authController.authorizeJWTWorker, new WorkerDashboardRoutes().router);
    this.router.use("/order",this.authController.authorizeJWTWorker, new WorkerOrderRoutes().router);
    this.router.use("/user",this.authController.authorizeJWTWorker, new WorkerUserRoutes().router);
    this.router.use("/transaction",this.authController.authorizeJWTWorker, new WorkerTransactionRoutes().router);
  }
}
