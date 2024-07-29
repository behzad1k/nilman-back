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
    this.router.get("/single/:id", AdminUserController.single);
    this.router.post("/basic/:id?", AdminUserController.basic);
    this.router.post("/status/:id", AdminUserController.active);
    this.router.post("/workerOff/:id", AdminUserController.workerOff);
    this.router.post("/media/:id", multer(multerConfig('uploads/workers')).any(), AdminUserController.medias);
    this.router.delete("/:id", AdminUserController.delete);
  }
}
