import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './Order';
import { User } from './User';

@Entity()
export class WorkerOffs {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  fromTime: number

  @Column()
  toTime: number

  @Column()
  date: string

  @Column({
    nullable: true
  })
  orderId: number

  @Column()
  workerId: number

  @ManyToOne(() => User, user => user.workerOffs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId', referencedColumnName: 'id'})
  worker: User

  @ManyToOne(() => Order, order => order.worker, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id'})
  order: Order

}