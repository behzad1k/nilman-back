import { Router } from "express";
import AdminOrderController from "../../controllers/admin/AdminOrderController";
import OrderController from "../../controllers/OrderController";

export class AdminOrderRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get("/", AdminOrderController.index);
    this.router.get("/relatedWorkers/:id", AdminOrderController.getRelatedWorkers);
    this.router.get("/single/:id", AdminOrderController.single);
    this.router.get("/feedback/:id", AdminOrderController.feedback);
    this.router.delete("/:id", AdminOrderController.delete);
    this.router.post("/basic/:id?", AdminOrderController.basic);
    this.router.put("/products/:id", AdminOrderController.services);
    this.router.put("/payment/:id", AdminOrderController.payment);
    this.router.post("/assign/:id", AdminOrderController.assign);
    this.router.post("/sendPortal/:id", AdminOrderController.sendPortal);
  }
}
