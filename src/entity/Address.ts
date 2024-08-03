import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, DeleteDateColumn
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Discount } from './Discount';
import { District } from './District';
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text, {})
  title: string;

  @Column(dataTypes.number)
  userId: number;

  @Column(dataTypes.text)
  description: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  phoneNumber: string;

  @Column(dataTypes.text)
  longitude: string;

  @Column(dataTypes.text)
  latitude: string;

  @Column(dataTypes.integer)
  districtId?: number;

  @Column(dataTypes.string)
  postalCode?: string;

  @Column(dataTypes.string)
  pelak?: string;

  @Column(dataTypes.string)
  vahed?: string;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime, { nullable: true })
  @DeleteDateColumn()
  deletedAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: Relation<User>

  @ManyToOne(() => District, (district) => district.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"districtId", referencedColumnName: "id"})
  district: Relation<District>

  @OneToMany(() => Order, (order) => order.address, { onDelete: 'CASCADE' })
  order: Relation<Order>
}
