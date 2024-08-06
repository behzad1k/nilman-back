import { Router } from "express";
import multer from 'multer';
import AuthController from "../controllers/AuthController";
import OrderController from "../controllers/OrderController";
import multerConfig from '../middlewares/multer';

export class OrderRoutes {
  public router: Router;
  public authController: AuthController = new AuthController();


  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("", this.authController.authenticateJWT, OrderController.index);
    this.router.get("/single/:code", this.authController.authenticateJWT ,OrderController.single);
    this.router.post("/media/:id", multer(multerConfig('uploads/order')).any(), OrderController.medias)
    this.router.post("", this.authController.authenticateJWT,OrderController.create);
    this.router.put("", this.authController.authorizeJWTWorker, OrderController.update);
    this.router.delete("", this.authController.authenticateJWT ,OrderController.delete);
    this.router.get("/workers", OrderController.workers);
    this.router.get("/cart", OrderController.cart);
    this.router.delete("/service/:id", OrderController.deleteCartService);
    this.router.post("/pay", OrderController.pay);
    this.router.post("/pay/verify", OrderController.paymentVerify);
  }
}
