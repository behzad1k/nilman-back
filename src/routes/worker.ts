import { Router } from "express";
import AuthController from "../controllers/AuthController";
import WorkerDashboardController from '../controllers/worker/WorkerDashboardController';

export class WorkerRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("/salary/:id",this.authController.authorizeJWTWorker, WorkerDashboardController.salary);
  }
}
