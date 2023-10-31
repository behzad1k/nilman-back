import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany
} from "typeorm";
import { Length } from "class-validator";
import { Order } from "./Order";
import {User} from "./User";

@Entity()
export class Discount {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column("text", {})
  title: string;

  @Column("int", {nullable: true})
  percent: number;

  @Column("int", {nullable: true})
  amount: number;

  @Column("text")
  code: string;

  @Column("int", {nullable: true})
  userId: number;

  @Column("date")
  @CreateDateColumn()
  createdAt: Date;

  @Column("date")
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: User

  @OneToMany(() => Order, (order) => order.discount, { onDelete: 'CASCADE' })
  orders: Order[]

}
