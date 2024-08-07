import { Router } from "express";
import multer from 'multer';
import AuthController from "../../controllers/AuthController";
import WorkerDashboardController from '../../controllers/worker/WorkerDashboardController';
import multerConfig from '../../middlewares/multer';

export class WorkerDashboardRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("/salary", WorkerDashboardController.salary);
  }
}
