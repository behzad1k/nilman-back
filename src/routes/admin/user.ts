import { Router } from "express";
import multer from 'multer';
import AdminUserController from "../../controllers/admin/AdminUserController";
import AuthController from "../../controllers/AuthController";
import multerConfig from '../../middlewares/multer';

export class AdminUserRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminUserController.index);
    this.router.post("", multer(multerConfig('uploads/workers')).single('file'), AdminUserController.create);
    this.router.put("", AdminUserController.update);
    this.router.delete("", AdminUserController.delete);
    this.router.post("/workerOff", AdminUserController.workerOff);
  }
}
