import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn()
  id: number;

  // MongoDB的_id字段
  _id: ObjectId;

  // 基本信息
  @Column({ type: 'string', unique: true, nullable: true })
  databaseId: string;  // 新增字段用于存储MongoDB的_id

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  age: number;

  @Column({ nullable: true })
  wechat?: string;

  @Column({ nullable: true })
  idNumber?: string;

  @Column()
  education: string;

  @Column()
  nativePlace: string;

  @Column()
  experienceYears: number;

  @Column({ nullable: true })
  maritalStatus?: string;

  @Column({ nullable: true })
  religion?: string;

  @Column({ nullable: true })
  currentAddress?: string;

  @Column({ nullable: true })
  hukouAddress?: string;

  @Column({ nullable: true })
  birthDate?: string;

  @Column({ nullable: true })
  ethnicity?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  zodiac?: string;

  @Column({ nullable: true })
  zodiacSign?: string;

  // 工作信息
  @Column()
  jobType: string;

  @Column({ nullable: true })
  expectedSalary?: number;

  @Column({ nullable: true })
  serviceArea?: string;

  @Column({ nullable: true })
  orderStatus?: string;

  @Column('simple-array', { nullable: true })
  skills?: string[];

  @Column({ nullable: true })
  leadSource?: string;

  @Column('json', { nullable: true })
  workExperience?: { startDate: string; endDate: string; description: string }[];

  // 文件信息
  @Column({ nullable: true })
  idCardFrontUrl?: string;

  @Column({ nullable: true })
  idCardBackUrl?: string;

  @Column('simple-array', { nullable: true })
  photoUrls?: string[];

  @Column('simple-array', { nullable: true })
  certificateUrls?: string[];

  @Column('simple-array', { nullable: true })
  medicalReportUrls?: string[];

  // 时间戳
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * 文件存储说明:
 * 1. 基础信息存储在常规字段（name, phone等）
 * 2. 文件存储采用以下策略:
 *    - 身份证正反面: idCardFrontUrl/idCardBackUrl
 *    - 证书文件: certificateUrls[]
 *    - 体检报告: medicalReportUrls[]
 *    - 照片: photoUrls[]
 * 3. 所有文件存储路径格式: /uploads/resumes/:id/filename.ext
 */
