import { Router } from "express";
import AdminAddressController from "../../controllers/admin/AdminAddressController";
import AuthController from "../../controllers/AuthController";

export class AdminAddressRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {

    // Get own user
    this.router.get("/", AdminAddressController.index);
    this.router.post("/basic/:id?", AdminAddressController.basic);
    this.router.delete("/delete", AdminAddressController.delete);
  }
}
