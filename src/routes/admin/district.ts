import { Router } from "express";
import AdminAddressController from "../../controllers/admin/AdminAddressController";
import AdminDistrictController from '../../controllers/admin/AdminDistrictController';
import AuthController from "../../controllers/AuthController";

export class AdminDistrictRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {

    // Get own user
    this.router.get("", AdminDistrictController.index);
    this.router.get("/single/:id", AdminDistrictController.single);
    this.router.post("/basic/:id?", AdminDistrictController.basic);
    this.router.delete("/:id", AdminDistrictController.delete);
  }
}
