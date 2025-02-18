import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable, TreeChildren, Tree, TreeParent, Relation
} from 'typeorm';
import { Length } from "class-validator";
import { dataTypes } from '../utils/enums';
import Media from './Media';
import { Order } from "./Order";
import { User } from "./User";
import "reflect-metadata";
@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text, { nullable: true })
  description: string;

  @Column(dataTypes.integer)
  price: number;

  @Column(dataTypes.integer, { default: 0})
  finalPrice: number;

  @Column(dataTypes.integer, { default: 0 })
  credit: number;

  @Column(dataTypes.text, { default: null })
  authority: string;

  @Column(dataTypes.text, { nullable: true })
  refId: string;

  @Column(dataTypes.boolean, { default: false })
  isPaid: boolean;

  @Column(dataTypes.text, { default: null, nullable: true })
  randomCode: string;

  @Column(dataTypes.string, { default: 'zarinpal' })
  method: string;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
  orders: Relation<Order[]>
}
