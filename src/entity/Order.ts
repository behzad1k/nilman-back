import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn, JoinTable, ManyToMany,
  ManyToOne,
  OneToMany, OneToOne,
  PrimaryGeneratedColumn, Relation,
  UpdateDateColumn
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Address } from "./Address";
import { Discount } from './Discount';
import { Feedback } from './Feedback';
import { Service } from "./Service";
import { User } from "./User";
import "reflect-metadata";
@Entity()

export class Order {

  @PrimaryGeneratedColumn()
  id: number

  @Column(dataTypes.integer)
  price: number

  @Column(dataTypes.integer, { nullable: true })
  discountAmount: number

  @Column(dataTypes.string)
  code: string

  @Column(dataTypes.integer, {
    nullable: true
  })
  discountId?: number

  @Column(dataTypes.integer, {
    default: 0
  })
  transportation?: number

  @Column(dataTypes.integer, {
    nullable: true
  })
  userId?: number

  @Column(dataTypes.integer)
  serviceId?: number

  @Column(dataTypes.text)
  status: string

  @Column(dataTypes.integer, {
    nullable: true
  })
  workerId: number

  @Column(dataTypes.integer, {
    nullable: true
  })
  attributeId: number

  @Column(dataTypes.integer)
  addressId: number

  @Column(dataTypes.text)
  date: string

  @Column(dataTypes.integer)
  fromTime: number

  @Column(dataTypes.integer)
  toTime: number

  @Column(dataTypes.boolean, {
    default: true
  })
  inCart: boolean

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({name: 'userId', referencedColumnName: 'id'})
  user: Relation<User>

  @ManyToOne(() => Discount, (discount) => discount.orders, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({name: 'discountId', referencedColumnName: 'id'})
  discount?: Relation<Discount>

  @ManyToOne(() => Service, (service) => service.orders, { onDelete: 'CASCADE' })
  @JoinColumn({name: 'serviceId', referencedColumnName: 'id'})
  service: Relation<Service>

  @ManyToOne(() => Address, (address) => address.order, { onDelete: 'CASCADE' })
  @JoinColumn({name: 'addressId', referencedColumnName: 'id'})
  address: Relation<Address>

  @ManyToOne(() => User, (user) => user.jobs, { nullable: true,onDelete: 'CASCADE' })
  @JoinColumn({name: 'workerId', referencedColumnName: 'id'})
  worker?: Relation<User>

  @ManyToMany(() => Service, (service) => service.attributeOrders, { onDelete: 'CASCADE' })
  @JoinTable({name: 'order_attribute'})
  attributes: Relation<Service[]>

  @OneToOne(() => Feedback, (feedback) => feedback.order, { onDelete: 'CASCADE'})
  feedback: Feedback;

}