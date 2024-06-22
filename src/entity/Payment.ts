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

  @Column(dataTypes.text)
  authority: string;

  @Column(dataTypes.integer, { nullable: true })
  refId: number;

  @Column(dataTypes.integer)
  orderId: number;

  @Column(dataTypes.boolean, { default: false })
  isPaid: boolean;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id'})
  order: Relation<Order>
}
