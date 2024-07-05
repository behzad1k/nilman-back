import { Router } from "express";
import AuthController from "../controllers/AuthController";
import FeedbackController from "../controllers/FeedbackController";

export class FeedbackRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.post("/", FeedbackController.submit);
    this.router.get("/factors", FeedbackController.factors);
  }
}
