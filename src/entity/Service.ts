import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable, TreeChildren, Tree, TreeParent
} from 'typeorm';
import { Length } from "class-validator";
import { Order } from "./Order";
import { User } from "./User";

@Entity()
@Tree('nested-set')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column()
  @Length(3, 100)
  description: string;

  @Column({ nullable: true })
  parentId: string;

  @Column()
  price: number;

  @Column({
    default: false
  })
  hasColor: boolean;

  @Column()
  section: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.service, { onDelete: 'CASCADE' })
  orders: Order[]

  @TreeChildren()
  attributes: Service[];

  @TreeParent()
  parent: Service

  @OneToMany(() => User, user => user.service, { onDelete: 'CASCADE' })
  users: User[]

  @ManyToMany(() => Order, order => order.attributes, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'order_attribute'
  })
  attributeOrders: Order[]

  // @ManyToMany(() => User,(user) => user.likedTweaks)
  // @JoinTable({
  //   name: "like",
  // })
  // likes : User[];

  // @ManyToOne((type) => Service,(tweak) => tweak.children  )
  // @JoinColumn({ name:"parentId", referencedColumnName: "id"})
  // parent: Service;
  //
  // @OneToMany((type) => Service,(tweak) => tweak.parent  )
  // @JoinColumn({ name:"parentId", referencedColumnName: "id"})
  // children: Service;
  //
  // @ManyToOne(type => User,user => user.tweaks)
  // @JoinColumn({name:'userId', referencedColumnName: "id" })
  // user: User;
}
