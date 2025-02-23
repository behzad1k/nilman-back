import { Router } from "express";
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
    this.router.get("/single/:id", AdminDiscountController.single);
    this.router.post("/basic/:id?", AdminDiscountController.basic);
    this.router.delete("/:id", AdminDiscountController.delete);
  }
}
