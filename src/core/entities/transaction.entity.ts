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
import { User } from './user.entity';

export enum TransactionType {
  SALE = 'sale',
  RENT = 'rent',
  LEASE = 'lease',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  commissionAmount: number;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column({ name: 'buyer_id', nullable: true })
  buyerId?: string;

  @Column({ name: 'seller_id', nullable: true })
  sellerId?: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate: Date;

  @Column({ name: 'completion_date', type: 'date', nullable: true })
  completionDate?: Date;

  @Column('text', { nullable: true })
  notes: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Property, (property) => property.transactions)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'buyer_id' })
  buyer?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'seller_id' })
  seller?: User;
}