import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
} from "typeorm";
import { dataTypes } from "../utils/enums";
import { Order } from "./Order";
import { User } from "./User";
import "reflect-metadata";

@Entity()
@Index(["userId", "date"])
@Index(["date", "fromTime", "toTime"])
@Index(["orderId"])
export class WorkerOffs {
	@PrimaryGeneratedColumn()
	id: number;

	@Column(dataTypes.float)
	fromTime: number;

	@Column(dataTypes.float)
	toTime: number;

	@Column(dataTypes.string, { length: 10 })
	date: string;

	@Column(dataTypes.integer, { nullable: true })
	orderId: number;

	@Column(dataTypes.integer)
	userId: number;

	@Column(dataTypes.boolean, { default: true })
	isStrict: boolean;

	@ManyToOne(() => User, (user) => user.workerOffs, { onDelete: "CASCADE" })
	@JoinColumn({ name: "userId", referencedColumnName: "id" })
	worker: Relation<User>;

	@ManyToOne(() => Order, (order) => order.worker, { onDelete: "CASCADE" })
	@JoinColumn({ name: "orderId", referencedColumnName: "id" })
	order: Relation<Order>;
}
