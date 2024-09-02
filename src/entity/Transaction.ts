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
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text, { nullable: true })
  description: string;

  @Column(dataTypes.integer)
  amount: number;

  @Column(dataTypes.text)
  code: string;

  @Column(dataTypes.integer, { nullable: true, default: null })
  mediaId: number;

  @Column(dataTypes.integer, { nullable: true, default: null })
  userId: number;

  @Column(dataTypes.text)
  date: string;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Media, media => media.transactions, { onDelete: 'CASCADE', nullable: true })
  media: Relation<Media>

  @ManyToOne(() => User, user => user.transactions, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({
    name: 'userId',
    referencedColumnName: 'id'
  })
  worker: Relation<Media>

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.transaction, { onDelete: 'CASCADE' })
  orders: Relation<Order[]>
}
