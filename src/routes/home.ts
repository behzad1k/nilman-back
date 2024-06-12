import { Router } from "express";
import AuthController from "../controllers/AuthController";
import HomeController from "../controllers/HomeController";

export class HomeRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("/posts", HomeController.posts);
  }
}
