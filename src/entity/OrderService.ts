import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Color } from './Color';
import { Order } from "./Order";
import { Service } from './Service';
import { User } from "./User";

@Entity()
export class OrderService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.integer)
  serviceId: number;

  @Column(dataTypes.integer)
  orderId: number;

  @Column(dataTypes.integer)
  price: number;

  @Column(dataTypes.integer, { nullable: true, default: null })
  colorId: number;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Order, (order) => order.orderServices, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'orderId',
    referencedColumnName: 'id'
  })
  order: Relation<Order>

  @ManyToOne(() => Color, (order) => order.orderServices, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'colorId',
    referencedColumnName: 'id'
  })
  color: Relation<Color>

  @ManyToOne(() => Service, (order) => order.orderServices, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'serviceId',
    referencedColumnName: 'id'
  })
  service: Relation<Service>
}
