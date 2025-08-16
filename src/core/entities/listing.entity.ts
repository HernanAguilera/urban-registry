import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Property } from './property.entity';

export enum ListingType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum ListingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD = 'sold',
  RENTED = 'rented',
  EXPIRED = 'expired',
}

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ListingType,
  })
  type: ListingType;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('text', { nullable: true })
  description: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'listed_date', type: 'date' })
  listedDate: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  inquiries: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Property, (property) => property.listings)
  @JoinColumn({ name: 'property_id' })
  property: Property;
}