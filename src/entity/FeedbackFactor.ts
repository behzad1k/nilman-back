import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, OneToOne, ManyToMany, JoinTable
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Feedback } from './Feedback';
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class FeedbackFactor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text, { nullable: true })
  description: string;

  @Column(dataTypes.text)
  title: string;

  @Column(dataTypes.text)
  slug: string;

  @Column(dataTypes.boolean)
  isPositive: boolean;

  @ManyToMany(() => Feedback, feedback => feedback.feedbackFactors)
  @JoinTable({
    name: 'feedback_factor_feedbacks'
  })
  feedbacks: Feedback[];
}
