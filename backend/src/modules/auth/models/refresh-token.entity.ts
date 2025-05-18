import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column()
  expiresAt: Date;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column({ default: false })
  isRevoked: boolean;
} 