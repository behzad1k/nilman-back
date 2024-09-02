import { Router } from "express";
import multer from 'multer';
import AdminServiceController from '../../controllers/admin/AdminServiceController';
import AdminTransactionController from "../../controllers/admin/AdminTransactionController";
import AdminUserController from '../../controllers/admin/AdminUserController';
import multerConfig from '../../middlewares/multer';

export class AdminTransactionRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminTransactionController.index);
    this.router.get("/single/:id", AdminTransactionController.single);
    this.router.post("/basic/:id?", AdminTransactionController.basic);
    this.router.post("/medias/:id", multer(multerConfig('uploads/transactions')).any(), AdminTransactionController.medias);
    this.router.delete("/:id", AdminTransactionController.delete);
  }
}
