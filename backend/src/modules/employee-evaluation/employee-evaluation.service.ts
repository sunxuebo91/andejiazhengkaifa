import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeEvaluation } from './models/employee-evaluation.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { QueryEvaluationDto } from './dto/query-evaluation.dto';

@Injectable()
export class EmployeeEvaluationService {
  private readonly logger = new Logger(EmployeeEvaluationService.name);

  constructor(
    @InjectModel(EmployeeEvaluation.name)
    private readonly evaluationModel: Model<EmployeeEvaluation>,
  ) {}

  /**
   * 创建员工评价
   */
  async create(dto: CreateEvaluationDto, evaluatorId: string, evaluatorName: string) {
    try {
      this.logger.log(`创建员工评价: 员工=${dto.employeeName}, 评价人=${evaluatorName}`);

      const evaluation = new this.evaluationModel({
        ...dto,
        employeeId: new Types.ObjectId(dto.employeeId),
        evaluatorId: new Types.ObjectId(evaluatorId),
        evaluatorName,
        contractId: dto.contractId ? new Types.ObjectId(dto.contractId) : undefined,
        evaluationDate: new Date(),
        status: dto.status || 'published',
        isPublic: dto.isPublic ?? false,
      });

      const saved = await evaluation.save();
      this.logger.log(`员工评价创建成功: ${saved._id}`);

      return saved;
    } catch (error) {
      this.logger.error(`创建员工评价失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取员工评价列表
   */
  async findAll(query: QueryEvaluationDto) {
    try {
      const { employeeId, evaluatorId, evaluationType, status, page = 1, pageSize = 10 } = query;

      const filter: any = {};
      if (employeeId) filter.employeeId = new Types.ObjectId(employeeId);
      if (evaluatorId) filter.evaluatorId = new Types.ObjectId(evaluatorId);
      if (evaluationType) filter.evaluationType = evaluationType;
      if (status) filter.status = status;

      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        this.evaluationModel
          .find(filter)
          .sort({ evaluationDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .populate('employeeId', 'name phone jobType')
          .populate('evaluatorId', 'username name')
          .lean()
          .exec(),
        this.evaluationModel.countDocuments(filter).exec(),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.logger.error(`获取员工评价列表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取员工评价详情
   */
  async findOne(id: string) {
    try {
      const evaluation = await this.evaluationModel
        .findById(id)
        .populate('employeeId', 'name phone jobType')
        .populate('evaluatorId', 'username name')
        .exec();

      if (!evaluation) {
        throw new NotFoundException('评价不存在');
      }

      return evaluation;
    } catch (error) {
      this.logger.error(`获取员工评价详情失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取员工评价统计
   */
  async getStatistics(employeeId: string) {
    try {
      this.logger.log(`获取员工评价统计: ${employeeId}`);

      const evaluations = await this.evaluationModel
        .find({ 
          employeeId: new Types.ObjectId(employeeId),
          status: 'published'
        })
        .lean()
        .exec();

      if (evaluations.length === 0) {
        return {
          employeeId,
          totalEvaluations: 0,
          averageRating: 0,
          averageServiceAttitude: 0,
          averageProfessionalSkill: 0,
          averageWorkEfficiency: 0,
          averageCommunication: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          recentEvaluations: [],
        };
      }

      // 计算平均分
      const totalRating = evaluations.reduce((sum, e) => sum + e.overallRating, 0);
      const averageRating = (totalRating / evaluations.length).toFixed(2);

      const serviceAttitudeRatings = evaluations.filter(e => e.serviceAttitudeRating);
      const averageServiceAttitude = serviceAttitudeRatings.length > 0
        ? parseFloat((serviceAttitudeRatings.reduce((sum, e) => sum + e.serviceAttitudeRating, 0) / serviceAttitudeRatings.length).toFixed(2))
        : 0;

      const professionalSkillRatings = evaluations.filter(e => e.professionalSkillRating);
      const averageProfessionalSkill = professionalSkillRatings.length > 0
        ? parseFloat((professionalSkillRatings.reduce((sum, e) => sum + e.professionalSkillRating, 0) / professionalSkillRatings.length).toFixed(2))
        : 0;

      const workEfficiencyRatings = evaluations.filter(e => e.workEfficiencyRating);
      const averageWorkEfficiency = workEfficiencyRatings.length > 0
        ? parseFloat((workEfficiencyRatings.reduce((sum, e) => sum + e.workEfficiencyRating, 0) / workEfficiencyRatings.length).toFixed(2))
        : 0;

      const communicationRatings = evaluations.filter(e => e.communicationRating);
      const averageCommunication = communicationRatings.length > 0
        ? parseFloat((communicationRatings.reduce((sum, e) => sum + e.communicationRating, 0) / communicationRatings.length).toFixed(2))
        : 0;

      // 评分分布
      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      evaluations.forEach(e => {
        const rating = Math.round(e.overallRating);
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });

      // 最近5条评价
      const recentEvaluations = evaluations
        .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime())
        .slice(0, 5);

      return {
        employeeId,
        totalEvaluations: evaluations.length,
        averageRating: parseFloat(averageRating.toString()),
        averageServiceAttitude,
        averageProfessionalSkill,
        averageWorkEfficiency,
        averageCommunication,
        ratingDistribution,
        recentEvaluations,
      };
    } catch (error) {
      this.logger.error(`获取员工评价统计失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}

