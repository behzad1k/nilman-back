import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne, Relation
} from 'typeorm';
import * as bcrypt from "bcryptjs";
import { dataTypes } from '../utils/enums';
import { Address } from "./Address";
import { Discount } from './Discount';
import { Feedback } from './Feedback';
import Media from './Media';
import { Order } from "./Order";
import { Service } from "./Service";
import { WorkerOffs } from './WorkerOffs';
import "reflect-metadata";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text)
  phoneNumber: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  name: string

  @Column(dataTypes.text, {
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

  @Column(dataTypes.text, {
    nullable: true
  })
  nationalCode: string;

  @Column(dataTypes.text, {nullable: false})
  password: string;

  @Column(dataTypes.text, {nullable: false})
  role: string;

  @Column(dataTypes.integer, {
    nullable: true,
    default: null
  })
  serviceId: number

  @Column(dataTypes.string, {
    nullable: true,
    default: null
  })
  birthday: string

  @Column(dataTypes.integer, {
    nullable: true,
    default: null
  })
  mediaId: number

  @Column(dataTypes.integer, {
    nullable: true,
    default: 1
  })
  district: number

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

  @OneToMany(() => Address , address => address.user, { eager: true, onDelete: 'CASCADE'  })
  addresses: Relation<Address[]>;

  @OneToMany(() => Order, order => order.user,{ eager: true, onDelete: 'CASCADE' })
  orders: Relation<Order[]>

  @OneToMany(() => Discount, discount => discount.user,{ eager: true, onDelete: 'CASCADE' })
  discounts: Relation<Discount[]>

  @OneToMany(() => Order, order => order.worker, { nullable: true, onDelete: 'CASCADE' })
  jobs: Relation<Order[]>

  @OneToMany(() => WorkerOffs, userOffs => userOffs.worker, { nullable: true, onDelete: 'CASCADE' })
  workerOffs: Relation<WorkerOffs[]>

  @OneToMany(() => Feedback, feedbacks => feedbacks.user, { nullable: true, onDelete: 'CASCADE' })
  feedbacks: Relation<Feedback[]>

  @ManyToOne(() => Service, service => service.users, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'serviceId',
    referencedColumnName: 'id'
  })
  service: Relation<Service>

  @ManyToOne(() => Media, media => media.users, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'mediaId',
    referencedColumnName: 'id'
  })
  media: Relation<Media>
  // eslint-disable-next-line @typescript-eslint/require-await
  hashPassword = async (): Promise<void> => {
    this.password = bcrypt.hashSync(this.password, 10);
  };

  checkIfUnencryptedPasswordIsValid(unencryptedPassword: string): boolean {
    return bcrypt.compareSync(unencryptedPassword, this.password);
  }
}
