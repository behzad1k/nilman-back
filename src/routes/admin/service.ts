import { Router } from "express";
import multer from 'multer';
import AdminServiceController from "../../controllers/admin/AdminServiceController";
import AdminUserController from '../../controllers/admin/AdminUserController';
import multerConfig from '../../middlewares/multer';

export class AdminServiceRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminServiceController.index);
    this.router.get("/single/:id", AdminServiceController.single);
    this.router.post("/basic/:id?", AdminServiceController.basic);
    this.router.post("/medias/:id", multer(multerConfig('uploads/service')).any(), AdminServiceController.medias);
    this.router.delete("/medias/:id", AdminServiceController.deleteMedia);
    this.router.delete("/:id", AdminServiceController.delete);
  }
}
