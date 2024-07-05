import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, OneToOne, ManyToMany, JoinTable
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { FeedbackFactor } from './FeedbackFactor';
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.number)
  userId: number;

  @Column(dataTypes.text)
  description: string;

  @Column(dataTypes.integer, { nullable: true })
  rating: number;

  @Column(dataTypes.integer)
  orderId: number;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: Relation<User>

  @OneToOne(() => Order, (order) => order.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"orderId", referencedColumnName: "id"})
  order: Relation<Order>

  @ManyToMany(() => FeedbackFactor, feedbackFactors => feedbackFactors.feedbacks)
  @JoinTable({
    name: 'feedback_factor_feedbacks'
  })
  feedbackFactors: FeedbackFactor[];
}
