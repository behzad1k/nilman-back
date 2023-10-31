import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne
} from "typeorm";
import * as bcrypt from "bcryptjs";
import { dataTypes } from '../utils/enums';
import { Address } from "./Address";
import { Discount } from './Discount';
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

  @Column(dataTypes.integer, {
    nullable: true,
    default: 1
  })
  district: number

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Address , address => address.user, { eager: true, onDelete: 'CASCADE'  })
  addresses: Address[];

  @OneToMany(() => Order, order => order.user,{ eager: true, onDelete: 'CASCADE' })
  orders: Order[]

  @OneToMany(() => Discount, discount => discount.user,{ eager: true, onDelete: 'CASCADE' })
  discounts: Discount[]

  @OneToMany(() => Order, order => order.worker, { nullable: true, onDelete: 'CASCADE' })
  jobs: Order[]

  @OneToMany(() => WorkerOffs, userOffs => userOffs.worker, { nullable: true, onDelete: 'CASCADE' })
  workerOffs: WorkerOffs[]

  @ManyToOne(() => Service, service => service.users, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'serviceId',
    referencedColumnName: 'id'
  })
  service: Service
  // eslint-disable-next-line @typescript-eslint/require-await
  hashPassword = async (): Promise<void> => {
    this.password = bcrypt.hashSync(this.password, 10);
  };

  checkIfUnencryptedPasswordIsValid(unencryptedPassword: string): boolean {
    return bcrypt.compareSync(unencryptedPassword, this.password);
  }
}
