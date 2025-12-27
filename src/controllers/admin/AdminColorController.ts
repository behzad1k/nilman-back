import { validate } from "class-validator";
import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { Color } from "../../entity/Color";
import { Order } from "../../entity/Order";
import { User } from "../../entity/User";
import { getUniqueSlug } from "../../utils/funs";

class AdminColorController {
	static users = () => getRepository(User);
	static orders = () => getRepository(Order);
	static colors = () => getRepository(Color);

	static index = async (req: Request, res: Response): Promise<Response> => {
		const colors = await this.colors().find();
		return res.status(200).send({
			code: 200,
			data: colors,
		});
	};
	static single = async (req: Request, res: Response): Promise<Response> => {
		const { id } = req.params;
		let color: Color;
		try {
			color = await getRepository(Color).findOneOrFail({
				where: { id: Number(req.params.id) },
			});
		} catch (e) {
			return res.status(400).send({
				code: 404,
				data: "Color Not Found",
			});
		}

		return res.status(200).send({
			code: 200,
			data: color,
		});
	};

	static basic = async (req: Request, res: Response): Promise<Response> => {
		const { id } = req.params;
		const { title, description, code } = req.body;
		let colorObj: Color;
		if (id) {
			try {
				colorObj = await this.colors().findOne({
					where: {
						id: Number(id),
					},
				});
			} catch (e) {
				return res.status(400).send({
					code: 1002,
					data: "Invalid Id",
				});
			}
		} else {
			colorObj = new Color();
			colorObj.slug = await getUniqueSlug(getRepository(Color), title);
		}
		if (title) colorObj.title = title;
		if (description) colorObj.description = description;
		if (code) colorObj.code = code;

		try {
			await this.colors().save(colorObj);
		} catch (e) {
			console.log(e);
			res.status(409).send("error try again later");
			return;
		}
		return res.status(200).send({
			code: 200,
			data: colorObj,
		});
	};

	static delete = async (req: Request, res: Response): Promise<Response> => {
		const { id } = req.params;
		try {
			await getRepository(Color).delete({
				id: Number(id),
			});
		} catch (e) {
			console.log(e);
			res.status(409).send("error try again later");
		}
		return res.status(200).send({
			code: 200,
			data: "Successful",
		});
	};
}

export default AdminColorController;
