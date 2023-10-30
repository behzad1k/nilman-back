import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn, ManyToMany, JoinTable, IsNull, ManyToOne
} from "typeorm";
import { Length, IsNotEmpty, IsEmail } from "class-validator";
import * as bcrypt from "bcryptjs";
import { Address } from "./Address";
import { Discount } from './Discount';
import { Order } from "./Order";
import { Service } from "./Service";
import { Like } from "./Like";
import { WorkerOffs } from './WorkerOffs';

@Entity()
// @Unique(["email","username"])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phoneNumber: string;

  @Column({
    nullable: true
  })
  name: string

  @Column({
    nullable: true
  })
  @Length(4, 100)
  lastName: string;

  @Column({
    nullable: true
  })
  tmpCode: string;

  @Column({
    nullable: true
  })
  @Length(8, 11)
  nationalCode: string;

  @Column()
  @Length(4, 100)
  @IsNotEmpty()
  password: string;

  @Column()
  @IsNotEmpty()
  role: string;

  @Column({
    nullable: true,
    default: null
  })
  serviceId: number

  @Column({
    nullable: true,
    default: 1
  })
  district: number

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
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
  generatePassword = () => {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  checkIfUnencryptedPasswordIsValid(unencryptedPassword: string): boolean {
    return bcrypt.compareSync(unencryptedPassword, this.password);
  }
}
