import { Router } from "express";
import AdminAddressController from "../../controllers/admin/AdminAddressController";
import AdminDiscountController from '../../controllers/admin/AdminDiscountController';
import AuthController from "../../controllers/AuthController";

export class AdminDiscountRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {

    // Get own user
    this.router.get("", AdminDiscountController.index);
    this.router.post("", AdminDiscountController.create);
    this.router.put("", AdminDiscountController.update);
    this.router.delete("", AdminDiscountController.delete);
  }
}
