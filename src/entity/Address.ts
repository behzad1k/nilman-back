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
export class Address {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  @Length(3, 100)
  title: string;

  @Column()
  userId: number;

  @Column()
  @Length(3, 100)
  description: string;

  @Column({
    nullable: true
  })
  phoneNumber: string;

  @Column()
  longitude: string;

  @Column()
  latitude: string;

  @Column()
  district: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name:"userId", referencedColumnName: "id"})
  user: User

  @OneToMany(() => Order, (order) => order.address, { onDelete: 'CASCADE' })
  order: Order

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
