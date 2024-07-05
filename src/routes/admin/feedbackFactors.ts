import { Router } from "express";
import multer from 'multer';
import AdminFeedbackFactorController from "../../controllers/admin/AdminFeedbackFactorController";
import AdminUserController from '../../controllers/admin/AdminUserController';
import multerConfig from '../../middlewares/multer';

export class AdminFeedbackFactorRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminFeedbackFactorController.index);
    this.router.get("/single/:id", AdminFeedbackFactorController.single);
    this.router.post("/basic/:id?", AdminFeedbackFactorController.basic);
    this.router.delete("/:id", AdminFeedbackFactorController.delete);
  }
}
