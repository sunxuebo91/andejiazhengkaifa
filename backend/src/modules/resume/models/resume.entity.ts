import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('resumes')
export class Resume {
  @PrimaryColumn()
  id: string;

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

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}