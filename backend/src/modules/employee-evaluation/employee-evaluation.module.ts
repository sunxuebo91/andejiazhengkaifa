import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeEvaluationController } from './employee-evaluation.controller';
import { EmployeeEvaluationService } from './employee-evaluation.service';
import { EmployeeEvaluation, EmployeeEvaluationSchema } from './models/employee-evaluation.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeEvaluation.name, schema: EmployeeEvaluationSchema },
    ]),
    NotificationModule,
  ],
  controllers: [EmployeeEvaluationController],
  providers: [EmployeeEvaluationService],
  exports: [EmployeeEvaluationService],
})
export class EmployeeEvaluationModule {}

