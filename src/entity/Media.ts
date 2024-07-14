import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
import { dataTypes } from '../utils/enums';
import { OrderService } from './OrderService';
import { Service } from './Service';
import { User } from './User';

@Entity()
export default class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(dataTypes.text)
  title: string;

  @Column(dataTypes.text)
  mime: string;

  @Column(dataTypes.text)
  size: string;

  @Column(dataTypes.text)
  path: string;

  @Column(dataTypes.text)
  url: string;

  @Column(dataTypes.text)
  originalTitle: string;

  @Column(dataTypes.datetime)
  @CreateDateColumn()
  createdAt: Date;

  @Column(dataTypes.datetime)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, user => user.media, { nullable: true })
  users: User[];

  @OneToMany(() => Service, service => service.media, { onDelete:'CASCADE', nullable: true })
  services: Service[];

  @OneToMany(() => OrderService, orderService => orderService.media, { onDelete:'CASCADE', nullable: true })
  orderServices: OrderService[];

}

