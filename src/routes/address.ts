import { Router } from "express";
import AddressController from "../controllers/AddressController";
import AuthController from "../controllers/AuthController";

export class AddressRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", this.authController.authenticateJWT, AddressController.index);
    this.router.get("/search", AddressController.search);
    this.router.get("/geocode", AddressController.geoCode);
    this.router.post("/:id?", this.authController.authenticateJWT, AddressController.basic);
    this.router.put("", this.authController.authenticateJWT, AddressController.update);
    this.router.delete("/:id", this.authController.authenticateJWT, AddressController.delete);
  }
}
