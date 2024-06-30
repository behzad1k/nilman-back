import { Router } from "express";
import AuthController from "../controllers/AuthController";
import ColorController from "../controllers/ColorController";

export class ColorRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("/", ColorController.index);
  }
}
