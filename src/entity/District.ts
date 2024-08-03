import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Relation, ManyToMany, JoinTable
} from 'typeorm';
import { dataTypes } from '../utils/enums';
import { Address } from './Address';
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class District {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column(dataTypes.text, {})
  title: string;

  @Column(dataTypes.text, {
    nullable: true
  })
  description: string;

  @Column(dataTypes.text)
  code: string;

  @Column("boolean", {default: true})
  active: boolean;

  @ManyToMany(() => User, (user) => user.discounts, { onDelete: 'CASCADE' })
  @JoinTable({ name:"district_user"})
  users: Relation<User[]>

  @OneToMany(() => Address, (address) => address.districtId, { onDelete: 'CASCADE' })
  addresses: Address[]

}
