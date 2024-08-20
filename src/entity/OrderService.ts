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

  @Column(dataTypes.integer, { nullable: true, default: null })
  mediaId: number;

  @Column(dataTypes.integer)
  price: number;

  @Column(dataTypes.text, { nullable: true })
  pinterest: string;

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

  @ManyToMany(() => Color, (order) => order.orderServices, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'order_service_color',
  })
  colors: Relation<Color[]>

  @ManyToOne(() => Media, media => media.orderServices, { onDelete: 'CASCADE', nullable: true })
  media: Relation<Media>

  @ManyToOne(() => Service, (order) => order.orderServices, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'serviceId',
    referencedColumnName: 'id'
  })
  service: Relation<Service>
}
