import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn, JoinTable, ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Address } from "./Address";
import { Service } from "./Service";
import { User } from "./User";

@Entity()

export class Order {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  price: number

  @Column({
    nullable: true
  })
  discount?: number

  @Column({
    default: 0
  })
  transportation?: number

  @Column({
    nullable: true
  })
  userId?: number

  @Column()
  serviceId?: number

  @Column()
  status: string

  @Column({
    nullable: true
  })
  workerId: number

  @Column({
    nullable: true
  })
  attributeId: number

  @Column()
  addressId: number

  @Column()
  date: string

  @Column()
  fromTime: number

  @Column()
  toTime: number

  @Column({
    default: true
  })
  inCart: boolean

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({name: 'userId', referencedColumnName: 'id'})
  user: User

  @ManyToOne(() => Service, (service) => service.orders, { onDelete: 'CASCADE' })
  @JoinColumn({name: 'serviceId', referencedColumnName: 'id'})
  service: Service

  @ManyToOne(() => Address, (address) => address.order, { onDelete: 'CASCADE' })
  @JoinColumn({name: 'addressId', referencedColumnName: 'id'})
  address: Address

  @ManyToOne(() => User, (user) => user.jobs, {
    nullable: true,onDelete: 'CASCADE'
  })
  @JoinColumn({name: 'workerId', referencedColumnName: 'id'})
  worker?: User

  @ManyToMany(() => Service, (service) => service.attributeOrders, { onDelete: 'CASCADE' })
  @JoinTable({name: 'order_attribute'})
  attributes: Service[]

}