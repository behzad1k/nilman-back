/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/unbound-method */
import { Router } from "express";
import UserController from "../controllers/UserController";
import AuthController from "../controllers/AuthController";

export class AuthRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    // Login route
    this.router.post("/login", UserController.login);

    this.router.post("/admin/login", UserController.loginAdmin);
    // Auth check
    this.router.post("/check", UserController.authCheck);

  }
}
