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
export class Color {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text, {})
  title: string;

  @Column(dataTypes.text, { nullable: true })
  description: string;

  @Column(dataTypes.text)
  code: string;

  @Column(dataTypes.text)
  slug: string;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  // @OneToMany(() => Order, (order) => order.color, { onDelete: 'CASCADE' })
  // orders: Relation<Order>[]

}
