import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, ManyToMany, JoinTable
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Address } from './Address';
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class Log {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column(dataTypes.text, {})
  ipAddress: string;

  @Column(dataTypes.text, {})
  method: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  userId: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  userAgent: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  data: string;

  @Column(dataTypes.text)
  pathname: string;

  @Column(dataTypes.text)
  date: string;

  @Column(dataTypes.text)
  time: string;

  @ManyToOne(() => User, (user) => user.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: Relation<User>

}
