import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class Discount {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column(dataTypes.text, {})
  title: string;

  @Column("int", {nullable: true})
  percent: number;

  @Column("int", {nullable: true})
  amount: number;

  @Column("int", {default: 0})
  timesUsed: number;

  @Column("int")
  maxCount: number;

  @Column("text")
  code: string;

  @Column("int", {nullable: true})
  userId: number;

  @Column("int", {nullable: true})
  forUserId: number;

  @Column("boolean", {default: false})
  active: boolean;

  @Column("date")
  @CreateDateColumn()
  createdAt: Date;

  @Column("date")
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: Relation<User>

  @ManyToOne(() => User, (user) => user.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"forUserId", referencedColumnName: "id"})
  forUser: Relation<User>

  @OneToMany(() => Order, (order) => order.discount, { onDelete: 'CASCADE' })
  orders: Order[]

}
