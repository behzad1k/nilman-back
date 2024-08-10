import { Router } from "express";
import multer from 'multer';
import AdminLogController from "../../controllers/admin/AdminLogController";
import AuthController from "../../controllers/AuthController";
import multerConfig from '../../middlewares/multer';

export class AdminLogRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminLogController.index);
  }
}
