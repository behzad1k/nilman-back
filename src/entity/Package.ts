import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, DeleteDateColumn, OneToOne, ManyToMany, JoinTable
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Discount } from './Discount';
import { District } from './District';
import { Order } from "./Order";
import { Service } from './Service';
import { User } from "./User";

@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text)
  title: string;

  @Column(dataTypes.text)
  description: string;

  @Column(dataTypes.integer, { default: null })
  triggerServiceId?: number;

  @Column(dataTypes.integer, { default: null })
  price?: number;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Service, service => service.triggerPackage)
  @JoinColumn({
    name: 'triggerServiceId',
    referencedColumnName: 'id'
  })
  triggerService: Service;

  @OneToMany(() => Order, (order) => order.package, { onDelete: 'CASCADE' })
  orders: Relation<Order[]>

  @ManyToMany(() => Service, (service) => service.packages, { onDelete: 'CASCADE' })
  services: Relation<Service[]>
}
