import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable, TreeChildren, Tree, TreeParent, Relation, DeleteDateColumn, OneToOne
} from 'typeorm';
import { Length } from "class-validator";
import { dataTypes } from '../utils/enums';
import { Discount } from './Discount';
import Media from './Media';
import { Order } from "./Order";
import { OrderService } from './OrderService';
import { OrderServiceAddOn } from './OrderServiceAddOn';
import { Package } from './Package';
import { User } from "./User";
import "reflect-metadata";
@Entity()
@Tree('materialized-path')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text)
  title: string;

  @Column(dataTypes.text)
  slug: string;

  @Column(dataTypes.text, { nullable: true })
  description: string;

  // @Column(dataTypes.text, { nullable: true })
  // parentId: string;

  @Column(dataTypes.integer, { nullable: true, default: null })
  mediaId: number;

  @Column(dataTypes.integer)
  price: number;

  @Column(dataTypes.integer, { default: 1 })
  showInList: number;

  @Column(dataTypes.integer, { nullable: true })
  pricePlus: number;

  @Column(dataTypes.integer, { nullable: true, default: null })
  sort: number;

  @Column(dataTypes.boolean, {
    default: false
  })
  hasColor: boolean;

  @Column(dataTypes.boolean, {
    default: false
  })
  openDrawer: boolean;

  @Column(dataTypes.boolean, {
    default: false
  })
  hasMedia: boolean;

  @Column(dataTypes.boolean, {
    default: false
  })
  isMulti: boolean;

  @Column(dataTypes.integer)
  section: number;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @Column(dataTypes.datetime)
  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => Order, (order) => order.service, { onDelete: 'CASCADE' })
  orders: Relation<Order[]>

  @TreeChildren()
  attributes: Relation<Service[]>

  @TreeParent({ onDelete: 'CASCADE'})
  parent: Service

  @ManyToMany(() => User, user => user.services, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'worker_services'
  })
  users: Relation<User[]>

  @ManyToOne(() => Media, media => media.services, { onDelete: 'CASCADE', nullable: true })
  media: Relation<Media>

  @OneToMany(() => OrderService, orderService => orderService.order, { onDelete: 'CASCADE'})
  orderServices: OrderService[];

  @OneToMany(() => Discount, discount => discount.service, { onDelete: 'CASCADE'})
  discounts: Discount[];

  @OneToMany(() => OrderServiceAddOn, orderService => orderService.addOn, { onDelete: 'CASCADE'})
  orderServicesAddOns: OrderServiceAddOn[];

  @ManyToMany(() => Service, service => service.addOns, { onDelete: 'CASCADE'})
  @JoinTable({
    name: 'addOns',
    // joinColumns: [
    //   {
    //     name: 'serviceId',
    //     referencedColumnName: 'id'
    //   },
    //   {
    //     name: 'addOn',
    //     referencedColumnName: 'id'
    //   }
    // ],
  })
  addOns: Service[];

  @OneToOne(() => Package, pack => pack.triggerService, { onDelete: 'CASCADE'})
  triggerPackage: Package;

  @ManyToMany(() => Package, (pack) => pack.services, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'package_service'
  })
  packages: Relation<Package[]>
}
