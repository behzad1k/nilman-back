/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/unbound-method */
import { Router } from "express";
import UserController from "../controllers/UserController";
import AuthController from "../controllers/AuthController";

export class UserRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", this.authController.authenticateJWT, UserController.getUser);
    this.router.put("", this.authController.authenticateJWT, UserController.update);
    this.router.get("/address", this.authController.authenticateJWT, UserController.getAddresses);
    this.router.get("/workerOffs/:id?", UserController.getWorkerOffs);
    this.router.put("/changePassword", this.authController.authenticateJWT, UserController.changePassword);
  }
}
