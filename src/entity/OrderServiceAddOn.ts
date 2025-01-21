import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, JoinTable, ManyToMany
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Color } from './Color';
import Media from './Media';
import { Order } from "./Order";
import { OrderService } from './OrderService';
import { Service } from './Service';
import { User } from "./User";

@Entity()
export class OrderServiceAddOn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.integer)
  orderServiceId: number;

  @Column(dataTypes.integer)
  addOnId: number;

  @Column(dataTypes.integer)
  price: number;

  @Column(dataTypes.integer, { nullable: true })
  singlePrice: number;

  @Column(dataTypes.integer, { default: 1 })
  count: number;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => OrderService, (orderService) => orderService.addOns, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'orderServiceId',
    referencedColumnName: 'id'
  })
  orderService: Relation<OrderService>

  @ManyToOne(() => Service, (order) => order.orderServicesAddOns, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'addOnId',
    referencedColumnName: 'id'
  })
  addOn: Relation<Service>
}
