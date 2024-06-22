import { Router } from "express";
import AdminFeedbackController from "../../controllers/admin/AdminFeedbackController";

export class AdminFeedbackRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", AdminFeedbackController.index);
    this.router.delete("/:id", AdminFeedbackController.delete);
  }
}
