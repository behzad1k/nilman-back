import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany
} from "typeorm";
import { Length } from "class-validator";
import { Order } from "./Order";
import {User} from "./User";

@Entity()
export class Discount {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  @Length(3, 100)
  title: string;

  @Column({nullable: true})
  percent: number;

  @Column({nullable: true})
  amount: number;

  @Column()
  code: string;

  @Column({nullable: true})
  userId: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: User

  @OneToMany(() => Order, (order) => order.discount, { onDelete: 'CASCADE' })
  orders: Order[]

}
