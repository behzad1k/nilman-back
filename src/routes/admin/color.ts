import { Router } from "express";
import multer from 'multer';
import AdminColorController from "../../controllers/admin/AdminColorController";
import AdminUserController from '../../controllers/admin/AdminUserController';
import multerConfig from '../../middlewares/multer';

export class AdminColorRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminColorController.index);
    this.router.get("/single/:id", AdminColorController.single);
    this.router.post("/basic/:id?", AdminColorController.basic);
    this.router.delete("/:id", AdminColorController.delete);
  }
}
