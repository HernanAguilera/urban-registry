import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Point,
} from 'typeorm';
import { User } from './user.entity';
import { Listing } from './listing.entity';
import { Transaction } from './transaction.entity';

export enum PropertyType {
  HOUSE = 'house',
  APARTMENT = 'apartment',
  COMMERCIAL = 'commercial',
  LAND = 'land',
  WAREHOUSE = 'warehouse',
}

export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD = 'sold',
  RENTED = 'rented',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  external_id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  address: string;

  @Column()
  sector: string;

  @Column({
    type: 'enum',
    enum: PropertyType,
  })
  type: PropertyType;

  @Column({
    type: 'enum',
    enum: PropertyStatus,
    default: PropertyStatus.ACTIVE,
  })
  status: PropertyStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  area: number;

  @Column({ nullable: true })
  bedrooms: number;

  @Column({ nullable: true })
  bathrooms: number;

  @Column({ nullable: true })
  parkingSpaces: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  coordinates: Point;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  valuation: number;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    csvBatch?: string;
    source?: string;
    lastCsvUpdate?: Date;
    importHistory?: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.properties)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Listing, (listing) => listing.property)
  listings: Listing[];

  @OneToMany(() => Transaction, (transaction) => transaction.property)
  transactions: Transaction[];
}