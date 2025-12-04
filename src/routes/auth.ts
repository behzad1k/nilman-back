import { Router } from "express";
import LoginController from "../controllers/LoginController";
import AuthController from "../controllers/AuthController";

export class AuthRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    // Admin
    this.router.post("/admin/login", LoginController.loginAdmin);
    // User
    this.router.post("/login", LoginController.login);
    this.router.post("/check", LoginController.authCheck);
    this.router.put("/verify-user", LoginController.verifyUser);
    // Worker
    this.router.post("/login/worker", LoginController.loginWorker);
    this.router.post("/check/worker", LoginController.authCheckWorker);

  }
}
