import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn()
  id: number;

  // 基本信息
  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  age: number;

  @Column({ nullable: true })
  wechat: string;

  @Column()
  idCardNumber: string;

  @Column()
  education: string;

  @Column()
  maritalStatus: string;

  @Column({ nullable: true })
  religion: string;

  @Column()
  currentAddress: string;

  @Column()
  hometown: string;

  @Column()
  hukou: string;

  @Column()
  birthday: Date;

  @Column()
  ethnicity: string;

  @Column()
  gender: string;

  @Column()
  zodiac: string;

  @Column()
  constellation: string;

  // 工作信息
  @Column()
  jobType: string;

  @Column()
  expectedSalary: number;

  @Column()
  workLocation: string;

  @Column()
  workStatus: string;

  @Column('simple-array', { nullable: true })
  skills: string[];

  @Column()
  experience: string;

  @Column()
  sourceChannel: string;

  @Column('jsonb')
  workExperience: {
    startDate: string;
    endDate: string;
    description: string;
  }[];

  // 文件信息
  @Column({ nullable: true })
  idCardFrontUrl: string;

  @Column({ nullable: true })
  idCardBackUrl: string;

  @Column('simple-array', { nullable: true })
  photoUrls: string[];

  @Column('simple-array', { nullable: true })
  certificateUrls: string[];

  @Column('simple-array', { nullable: true })
  medicalReportUrls: string[];

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
