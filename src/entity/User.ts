import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne, Relation, ManyToMany, JoinTable, Index
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from "bcryptjs";
import { dataTypes } from '../utils/enums';
import { Address } from "./Address";
import { Discount } from './Discount';
import { District } from './District';
import { Feedback } from './Feedback';
import { Log } from './Log';
import Media from './Media';
import { Order } from "./Order";
import { Service } from "./Service";
import { Transaction } from './Transaction';
import { WorkerOffs } from './WorkerOffs';
import "reflect-metadata";

@Entity()
@Index(["phoneNumber"])
@Index(["role", "status"])
@Index(["nationalCode"])
@Index(["username"])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.string, { nullable: false, length: 12 })
  phoneNumber: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  name: string

  @Column(dataTypes.string, {
    length: 255,
    nullable: true
  })
  username: string

  @Column(dataTypes.text ,{
    nullable: true
  })
  lastName: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  tmpCode: string;

  @Column(dataTypes.text)
  code: string;

  @Column(dataTypes.string, {
    nullable: true,
    length: 12
  })
  nationalCode: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  shebaNumber: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  cardNumber: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  hesabNumber: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  bankName: string;

  @Column(dataTypes.integer, {
    nullable: true
  })
  percent: number;

  @Column(dataTypes.boolean, {
    default: false
  })
  isVerified: boolean;

  @Column(dataTypes.boolean, {
    default: true
  })
  isWorkerChoosable: boolean;

  @Column(dataTypes.boolean, {
    default: false
  })
  isBlockSMS: boolean;

  @Column(dataTypes.integer, {
    default: 1
  })
  status: number;

  @Column(dataTypes.text, { nullable: true })
  @Exclude()
  password: string;

  @Column(dataTypes.string, { nullable: false, length: 100 })
  role: string;

  @Column(dataTypes.string, {
    nullable: true,
    default: null
  })
  birthday: string

  @Column(dataTypes.integer, {
    nullable: true,
    default: null
  })
  profileId: number

  @Column(dataTypes.integer, {
    nullable: true,
    default: 1
  })
  district: number

  @Column(dataTypes.integer, {
    default: 0
  })
  walletBalance: number

  @Column(dataTypes.datetime, {
    nullable: true
  })
  lastEntrance: Date;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Address , address => address.user, { onDelete: 'CASCADE'  })
  addresses: Relation<Address[]>;

  @OneToMany(() => Order, order => order.user, { onDelete: 'CASCADE' })
  orders: Relation<Order[]>

  @OneToMany(() => Discount, discount => discount.user, { onDelete: 'CASCADE' })
  discounts: Relation<Discount[]>

  @OneToMany(() => Order, order => order.worker, { nullable: true, onDelete: 'CASCADE' })
  jobs: Relation<Order[]>

  @OneToMany(() => WorkerOffs, userOffs => userOffs.worker, { nullable: true, onDelete: 'CASCADE' })
  workerOffs: Relation<WorkerOffs[]>

  @OneToMany(() => Feedback, feedbacks => feedbacks.user, { nullable: true, onDelete: 'CASCADE' })
  feedbacks: Relation<Feedback[]>

  @OneToMany(() => Log, log => log.user, { nullable: true, onDelete: 'CASCADE' })
  activities: Relation<Log[]>

  @OneToMany(() => Transaction, transactions => transactions.worker, { nullable: true, onDelete: 'CASCADE' })
  transactions: Relation<Transaction[]>

  @ManyToMany(() => Service, service => service.users, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'worker_services'
  })
  services: Relation<Service[]>

  @ManyToMany(() => District, district => district.users, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'district_user'
  })
  districts: Relation<District[]>

  @ManyToOne(() => Media, media => media.userProfiles, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'profileId',
    referencedColumnName: 'id'
  })
  profilePic: Relation<Media>

  @Exclude()
  hashPassword = async (): Promise<void> => {
    this.password = bcrypt?.hashSync(this.password, 10);
  };

  @Exclude()
  checkIfUnencryptedPasswordIsValid(unencryptedPassword: string): boolean {
    return bcrypt?.compareSync(unencryptedPassword, this.password);
  }
}