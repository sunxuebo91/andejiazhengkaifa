import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeEvaluationController } from './employee-evaluation.controller';
import { EmployeeEvaluationService } from './employee-evaluation.service';
import { EmployeeEvaluation, EmployeeEvaluationSchema } from './models/employee-evaluation.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeEvaluation.name, schema: EmployeeEvaluationSchema },
    ]),
  ],
  controllers: [EmployeeEvaluationController],
  providers: [EmployeeEvaluationService],
  exports: [EmployeeEvaluationService],
})
export class EmployeeEvaluationModule {}

