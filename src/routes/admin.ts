import { Router } from "express";
import AuthController from "../controllers/AuthController";
import { AdminAddressRoutes } from "./admin/address";
import { AdminColorRoutes } from './admin/color';
import { AdminDashboardRoutes } from './admin/dashboard';
import { AdminDiscountRoutes } from './admin/discount';
import { AdminFeedbackRoutes } from './admin/feedback';
import { AdminFeedbackFactorRoutes } from './admin/feedbackFactors';
import { AdminOrderRoutes } from "./admin/order";
import { AdminServiceRoutes } from "./admin/service";
import { AdminUserRoutes } from "./admin/user";

export class AdminRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.use("/address",this.authController.authorizeJWTAdmin,new AdminAddressRoutes().router)
    this.router.use("/dashboard",this.authController.authorizeJWTAdmin,new AdminDashboardRoutes().router)
    this.router.use("/discount",this.authController.authorizeJWTAdmin,new AdminDiscountRoutes().router)
    this.router.use("/service",this.authController.authorizeJWTAdmin,new AdminServiceRoutes().router)
    this.router.use("/feedback",this.authController.authorizeJWTAdmin,new AdminFeedbackRoutes().router)
    this.router.use("/feedbackFactor",this.authController.authorizeJWTAdmin,new AdminFeedbackFactorRoutes().router)
    this.router.use("/order",this.authController.authorizeJWTAdmin,new AdminOrderRoutes().router)
    this.router.use("/user",this.authController.authorizeJWTAdmin,new AdminUserRoutes().router)
    this.router.use("/color",this.authController.authorizeJWTAdmin,new AdminColorRoutes().router)

  }
}
