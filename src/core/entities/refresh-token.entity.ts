import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['tokenHash', 'userId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}