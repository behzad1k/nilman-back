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
    this.router.post("", AdminServiceController.create);
    this.router.post("/:id", multer(multerConfig('uploads/service')).single('file'), AdminServiceController.update);
    this.router.delete("", AdminServiceController.delete);
  }
}
