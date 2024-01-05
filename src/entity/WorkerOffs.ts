import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Order } from './Order';
import { User } from './User';
import "reflect-metadata";
@Entity()
export class WorkerOffs {
  @PrimaryGeneratedColumn()
  id: number

  @Column(dataTypes.integer)
  fromTime: number

  @Column(dataTypes.integer)
  toTime: number

  @Column(dataTypes.text)
  date: string

  @Column(dataTypes.integer, )
  orderId: number

  @Column(dataTypes.integer)
  workerId: number

  @ManyToOne(() => User, user => user.workerOffs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId', referencedColumnName: 'id'})
  worker: Relation<User>

  @ManyToOne(() => Order, order => order.worker, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id'})
  order: Relation<Order>

}