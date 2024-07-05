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
import { OrderService } from './OrderService';
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

  @Column(dataTypes.integer, { nullable: true, default: null })
  sort: number;

  @Column(dataTypes.boolean, {
    default: false
  })
  hasColor: boolean;

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

  @OneToMany(() => Order, (order) => order.service, { onDelete: 'CASCADE' })
  orders: Relation<Order[]>

  @TreeChildren()
  attributes: Relation<Service[]>

  @TreeParent({ onDelete: 'CASCADE'})
  parent: Service

  @OneToMany(() => User, user => user.service, { onDelete: 'CASCADE' })
  users: Relation<User[]>

  @ManyToOne(() => Media, media => media.services, { onDelete: 'CASCADE', nullable: true })
  media: Relation<Media>

  @OneToMany(() => OrderService, orderService => orderService.order, { onDelete: 'CASCADE'})
  orderServices: OrderService[];
  // @ManyToMany(() => User,(user) => user.likedTweaks)
  // @JoinTable({
  //   name: "like",
  // })
  // likes : User[];

  // @ManyToOne((type) => Service,(tweak) => tweak.children  )
  // @JoinColumn({ name:"parentId", referencedColumnName: "id"})
  // parent: Service;
  //
  // @OneToMany((type) => Service,(tweak) => tweak.parent  )
  // @JoinColumn({ name:"parentId", referencedColumnName: "id"})
  // children: Service;
  //
  // @ManyToOne(type => User,user => user.tweaks)
  // @JoinColumn({name:'userId', referencedColumnName: "id" })
  // user: User;
}
