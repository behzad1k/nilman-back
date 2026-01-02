import { validate } from "class-validator";
import { Request, Response } from "express";
import moment from "jalali-moment";
import { Between, getRepository, In, IsNull, MoreThan, Not } from "typeorm";
import { Order } from "../../entity/Order";
import { Service } from "../../entity/Service";
import { Transaction } from "../../entity/Transaction";
import { User } from "../../entity/User";
import { WorkerOffs } from "../../entity/WorkerOffs";
import { orderStatus } from "../../utils/enums";
import { getUniqueSlug, jwtDecode } from "../../utils/funs";
import sms from "../../utils/sms";

class WorkerDashboardController {
	static users = () => getRepository(User);
	static orders = () => getRepository(Order);
	static services = () => getRepository(Service);

	static salary = async (req: Request, res: Response): Promise<Response> => {
		const id = jwtDecode(req.headers.authorization);
		const { from, to } = req.query;

		const result = await this.orders()
			.createQueryBuilder("order")
			.select([
				"COALESCE(SUM(order.finalPrice), 0) as total",
				"COALESCE(SUM((order.price * order.workerPercent / 100) + order.transportation), 0) as totalProfit",
			])
			.where("order.workerId = :id", { id: Number(id) })
			.andWhere("order.status = :status", { status: orderStatus.Done })
			.andWhere("order.doneDate BETWEEN :from AND :to", {
				from: new Date(
					moment(from.toString(), "jYYYY-jMM-jDD-HH-mm")
						.locale("en")
						.format("YYYY-MM-DD HH:mm"),
				),
				to: new Date(
					moment(to.toString(), "jYYYY-jMM-jDD-HH-mm")
						.locale("en")
						.format("YYYY-MM-DD HH:mm"),
				),
			})
			.getRawOne();

		return res.status(200).send({
			code: 200,
			data: {
				total: parseFloat(result.total) || 0,
				profit: parseFloat(result.totalProfit) || 0,
			},
		});
	};

	static chart = async (req: Request, res: Response): Promise<Response> => {
		const id = jwtDecode(req.headers.authorization);

		const result = await getRepository(Order)
			.createQueryBuilder("order")
			.select([
				"DATE_FORMAT(order.doneDate, '%Y-%m') as monthKey",
				"COALESCE(SUM(CASE WHEN DAY(order.doneDate) <= 15 THEN order.finalPrice ELSE 0 END), 0) as firstPeriodTotal",
				"COALESCE(SUM(CASE WHEN DAY(order.doneDate) <= 15 THEN (order.price * order.workerPercent / 100) + order.transportation ELSE 0 END), 0) as firstPeriodProfit",
				"COALESCE(COUNT(CASE WHEN DAY(order.doneDate) <= 15 THEN 1 END), 0) as firstPeriodCount",
				"COALESCE(SUM(CASE WHEN DAY(order.doneDate) > 15 THEN order.finalPrice ELSE 0 END), 0) as secondPeriodTotal",
				"COALESCE(SUM(CASE WHEN DAY(order.doneDate) > 15 THEN (order.price * order.workerPercent / 100) + order.transportation ELSE 0 END), 0) as secondPeriodProfit",
				"COALESCE(COUNT(CASE WHEN DAY(order.doneDate) > 15 THEN 1 END), 0) as secondPeriodCount",
			])
			.where("order.workerId = :id", { id: Number(id) })
			.andWhere("order.status = :status", { status: orderStatus.Done })
			.groupBy("DATE_FORMAT(order.doneDate, '%Y-%m')")
			.orderBy("DATE_FORMAT(order.doneDate, '%Y-%m')", "ASC")
			.getRawMany();

		// Format the month names
		const formattedResult = result.map((item) => {
			const [year, month] = item.monthKey.split("-");
			const jalaliDate = moment(`${year}-${month}-01`, "YYYY-MM-DD");

			return {
				month: jalaliDate.locale("fa").format("jMMMM"),
				firstPeriodTotal: parseFloat(item.firstPeriodTotal) || 0,
				firstPeriodProfit: parseFloat(item.firstPeriodProfit) || 0,
				firstPeriodCount: parseInt(item.firstPeriodCount) || 0,
				secondPeriodTotal: parseFloat(item.secondPeriodTotal) || 0,
				secondPeriodProfit: parseFloat(item.secondPeriodProfit) || 0,
				secondPeriodCount: parseInt(item.secondPeriodCount) || 0,
			};
		});

		return res.status(200).send({
			code: 200,
			data: formattedResult,
		});
	};

	static income = async (req: Request, res: Response): Promise<Response> => {
		const id = jwtDecode(req.headers.authorization);

		const result = await this.orders()
			.createQueryBuilder("order")
			.select([
				"COALESCE(SUM(order.finalPrice), 0) as total",
				"COALESCE(SUM((order.price * order.workerPercent / 100) + order.transportation), 0) as totalProfit",
			])
			.where("order.workerId = :id", { id: Number(id) })
			.andWhere("order.status = :status", { status: orderStatus.Done })
			.andWhere("order.transactionId IS NULL")
			.getRawOne();

		const lastTransaction = await getRepository(Transaction).findOne({
			where: { userId: Number(id) },
			select: ["createdAt"],
			order: { createdAt: "DESC" },
		});

		return res.status(200).send({
			code: 200,
			data: {
				total: parseFloat(result.total) || 0,
				profit: parseFloat(result.totalProfit) || 0,
				lastTransactionDate: lastTransaction
					? moment(lastTransaction.createdAt).format("jYYYY/jMM/jDD")
					: null,
			},
		});
	};

	static index = async (req: Request, res: Response): Promise<Response> => {
		const services = await this.services().find({
			relations: ["parent"],
		});
		return res.status(200).send({
			code: 200,
			data: services,
		});
	};

	static create = async (req: Request, res: Response): Promise<Response> => {
		const { title, description, price, parent, section, hasColor } = req.body;
		let parentObj;
		if (parent) {
			try {
				parentObj = await this.services().findOne({
					where: {
						slug: parent,
					},
				});
			} catch (e) {
				return res.status(400).send({ code: 400, message: "Invalid Parent" });
			}
		}
		const service = new Service();
		service.title = title;
		service.description = description;
		service.price = parseFloat(price);
		service.slug = await getUniqueSlug(this.services(), title);
		service.section = section;
		if (hasColor) service.hasColor = hasColor;
		const errors = await validate(service);
		if (errors.length > 0) {
			res.status(400).send(errors);
			return;
		}
		try {
			await this.services().save(service);
		} catch (e) {
			res.status(409).send({ code: 409 });
			return;
		}
		return res.status(201).send({ code: 201, data: service });
	};

	static delete = async (req: Request, res: Response): Promise<Response> => {
		const { service } = req.body;
		let serviceObj;
		try {
			serviceObj = await this.services().findOneOrFail({
				where: {
					slug: service,
				},
			});
		} catch (error) {
			res.status(400).send({ code: 400, data: "Invalid Id" });
			return;
		}
		try {
			await this.services().delete(serviceObj.id);
		} catch (e) {
			res.status(409).send("error try again later");
		}
		return res.status(200).send({ code: 204, data: "Successful" });
	};
}

export default WorkerDashboardController;
