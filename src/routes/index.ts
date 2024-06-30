import { Router } from "express";
import { AddressRoutes } from "./address";
import { AdminRoutes } from "./admin";
import { ColorRoutes } from './color';
import { FeedbackRoutes } from './feedback';
import { HomeRoutes } from './home';
import { OrderRoutes } from "./order";
import { UserRoutes } from "./user";
import { AuthRoutes } from "./auth";
import { ServiceRoutes } from "./service";
import { WorkerRoutes } from './worker';

const routes = Router();

// routes.use("/auth", auth);
routes.use("/admin", new AdminRoutes().router);
routes.use("/address", new AddressRoutes().router);
routes.use("/user", new UserRoutes().router);
routes.use("/service", new ServiceRoutes().router);
routes.use("/order", new OrderRoutes().router);
routes.use("/feedback", new FeedbackRoutes().router);
routes.use("/worker", new WorkerRoutes().router);
routes.use("/home", new HomeRoutes().router);
routes.use("/color", new ColorRoutes().router);
routes.use("", new AuthRoutes().router);
export default routes;
