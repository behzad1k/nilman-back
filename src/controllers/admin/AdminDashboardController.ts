import { Request, Response } from "express";
import moment from "jalali-moment";
import { Between, getRepository, In, IsNull } from "typeorm";
import { validate } from "class-validator";
import { Order } from "../../entity/Order";
import { Service } from "../../entity/Service";
import { User } from "../../entity/User";
import { orderStatus } from "../../utils/enums";
import { getUniqueSlug } from "../../utils/funs";

class AdminDashboardController {
	static users = () => getRepository(User);
	static orders = () => getRepository(Order);
	static services = () => getRepository(Service);

	static worker = async (req: Request, res: Response): Promise<Response> => {
		const { id } = req.params;
		const { from, to } = req.query;

		const orders = await this.orders().find({
			where: {
				workerId: Number(id),
				createdAt: Between(from as any, to),
			},
		});

		return res.status(200).send({
			code: 200,
			data: orders,
		});
	};

	static timeSeriesData = async (
		req: Request,
		res: Response,
	): Promise<Response> => {
		const { from, to, worker, service } = req.query;

		if (!from || !to) {
			return res.status(400).send({
				code: 400,
				message: "from and to dates are required",
			});
		}

		// Parse dates
		const fromDate = moment(from as string, "jYYYY/jMM/jDD");
		const toDate = moment(to as string, "jYYYY/jMM/jDD");

		// Calculate date range in days
		const daysDiff = toDate.diff(fromDate, "days");

		// Determine grouping: daily if <= 30 days, monthly if > 30 days
		const groupByMonth = daysDiff > 30;

		// Build where clause
		const where: any = {
			date: Between(from, to),
		};

		if (worker && worker != "0") {
			where["workerId"] = worker;
		}

		if (service && service != "0") {
			where["serviceId"] = service;
		}

		// Fetch all orders in the date range
		const orders = await this.orders().find({
			where: where,
			order: {
				date: "ASC",
			},
		});

		// Group orders by date or month
		const groupedData = new Map<
			string,
			{ all: number; profit: number; worker: number }
		>();

		orders.forEach((order) => {
			let key: string;

			if (groupByMonth) {
				// Group by month: "1403/05"
				const orderDate = moment(order.date, "jYYYY/jMM/jDD");
				key = orderDate.format("jYYYY/jMM");
			} else {
				// Group by day: "1403/05/15"
				key = order.date;
			}

			if (!groupedData.has(key)) {
				groupedData.set(key, { all: 0, profit: 0, worker: 0 });
			}

			const data = groupedData.get(key)!;

			// Add to totals
			data.all += order.finalPrice;
			data.profit +=
				order.finalPrice -
				(order.price * order.workerPercent) / 100 -
				order.transportation;
			data.worker +=
				(order.price * order.workerPercent) / 100 + order.transportation;
		});

		// Convert Map to array and sort by date
		const result = Array.from(groupedData.entries())
			.map(([date, values]) => ({
				date,
				...values,
			}))
			.sort((a, b) => {
				const dateA = moment(
					a.date,
					groupByMonth ? "jYYYY/jMM" : "jYYYY/jMM/jDD",
				);
				const dateB = moment(
					b.date,
					groupByMonth ? "jYYYY/jMM" : "jYYYY/jMM/jDD",
				);
				return dateA.diff(dateB);
			});

		// Fill in missing dates/months with zero values
		const filledResult = [];

		if (groupByMonth) {
			// Fill months
			let currentDate = moment(from as string, "jYYYY/jMM/jDD").startOf(
				"jMonth",
			);
			const endDate = moment(to as string, "jYYYY/jMM/jDD").endOf("jMonth");

			while (currentDate.isSameOrBefore(endDate, "month")) {
				const key = currentDate.format("jYYYY/jMM");
				const existing = result.find((r) => r.date === key);

				filledResult.push(
					existing || {
						date: key,
						all: 0,
						profit: 0,
						worker: 0,
					},
				);

				currentDate.add(1, "jMonth");
			}
		} else {
			// Fill days
			let currentDate = moment(from as string, "jYYYY/jMM/jDD");
			const endDate = moment(to as string, "jYYYY/jMM/jDD");

			while (currentDate.isSameOrBefore(endDate, "day")) {
				const key = currentDate.format("jYYYY/jMM/jDD");
				const existing = result.find((r) => r.date === key);

				filledResult.push(
					existing || {
						date: key,
						all: 0,
						profit: 0,
						worker: 0,
					},
				);

				currentDate.add(1, "day");
			}
		}

		return res.status(200).send({
			code: 200,
			data: filledResult,
			meta: {
				groupBy: groupByMonth ? "month" : "day",
				daysDiff: daysDiff,
			},
		});
	};

	static generalInfo = async (
		req: Request,
		res: Response,
	): Promise<Response> => {
		const { from, to, worker, service } = req.query;
		const where = {};
		if (from && to) {
			where["date"] = Between(from, to);
		}
		if (worker && worker != "0") {
			where["workerId"] = worker;
		}
		if (service && service != "0") {
			where["serviceId"] = service;
		}
		const orders = await this.orders().find({
			where: where,
		});

		return res.status(200).send({
			code: 200,
			data: {
				past: {
					all: orders
						.filter((e) => e.status == orderStatus.Done)
						.reduce((acc, curr) => acc + curr.finalPrice, 0),
					profit: orders
						.filter((e) => e.status == orderStatus.Done)
						.reduce(
							(acc, curr) =>
								acc +
								(curr.finalPrice -
									(curr.price * curr.workerPercent) / 100 -
									curr.transportation),
							0,
						),
					worker: orders
						.filter((e) => e.status == orderStatus.Done)
						.reduce(
							(acc, curr) =>
								acc +
								((curr.price * curr.workerPercent) / 100 + curr.transportation),
							0,
						),
				},
				future: {
					all: orders
						.filter(
							(e) =>
								e.status == orderStatus.Paid ||
								e.status == orderStatus.Assigned,
						)
						.reduce((acc, curr) => acc + curr.finalPrice, 0),
					profit: orders
						.filter(
							(e) =>
								e.status == orderStatus.Paid ||
								e.status == orderStatus.Assigned,
						)
						.reduce(
							(acc, curr) =>
								acc +
								(curr.finalPrice -
									(curr.price * curr.workerPercent) / 100 -
									curr.transportation),
							0,
						),
					worker: orders
						.filter(
							(e) =>
								e.status == orderStatus.Paid ||
								e.status == orderStatus.Assigned,
						)
						.reduce(
							(acc, curr) =>
								acc +
								((curr.price * curr.workerPercent) / 100 + curr.transportation),
							0,
						),
				},
			},
		});
	};

	static sales = async (req: Request, res: Response): Promise<Response> => {
		const { from, to, worker, service } = req.query;
		const where = { status: orderStatus.Done };
		if (from && to) {
			where["doneDate"] = Between(
				moment(from.toString(), "jYYYY-jMM-jDD-HH-ss").format(
					"YYYY-MM-DD HH:ss",
				),
				moment(to.toString(), "jYYYY-jMM-jDD-HH-ss").format("YYYY-MM-DD HH:ss"),
			);
		}
		if (worker && worker != "0") {
			where["workerId"] = worker;
		}
		if (service && service != "0") {
			where["serviceId"] = service;
		}
		const orders = await this.orders().find({
			where: where,
		});

		let total = 0;
		orders.map((e) => (total += e.finalPrice));

		return res.status(200).send({
			code: 200,
			data: { salary: total },
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
		// service.parentId = parentObj?.id || null
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

	static update = async (req: Request, res: Response): Promise<Response> => {
		const { service, title, description, price, section, hasColor } = req.body;
		let serviceObj: Service;
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
		if (title) serviceObj.title = title;
		if (description) serviceObj.description = description;
		if (price) serviceObj.price = parseFloat(price);
		if (section) serviceObj.section = section;
		if (hasColor) serviceObj.hasColor = hasColor;
		const errors = await validate(serviceObj);
		if (errors.length > 0) {
			return res.status(400).send(errors);
		}
		try {
			await this.services().save(serviceObj);
		} catch (e) {
			res.status(409).send("error try again later");
			return;
		}
		return res.status(200).send({ code: 200, data: serviceObj });
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
		return res.status(204).send({});
	};
}

export default AdminDashboardController;
