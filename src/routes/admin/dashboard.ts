import { Router } from "express";
import multer from "multer";
import AdminDashboardController from "../../controllers/admin/AdminDashboardController";
import AuthController from "../../controllers/AuthController";
import multerConfig from "../../middlewares/multer";

export class AdminDashboardRoutes {
	public router: Router;
	public authController: AuthController = new AuthController();

	constructor() {
		this.router = Router();
		this.routes();
	}

	routes() {
		this.router.get("/sales", AdminDashboardController.sales);
		this.router.get("/generalInfo", AdminDashboardController.generalInfo);
		this.router.get("/worker/:id", AdminDashboardController.worker);
		this.router.get(
			"/time-series-data",
			AdminDashboardController.timeSeriesData,
		);
	}
}
