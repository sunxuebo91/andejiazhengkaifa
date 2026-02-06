import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FormController } from './form.controller';
import { FormService } from './form.service';
import { FormExportService } from './form-export.service';
import { FormConfig, FormConfigSchema } from './models/form-config.model';
import { FormField, FormFieldSchema } from './models/form-field.model';
import { FormSubmission, FormSubmissionSchema } from './models/form-submission.model';
import { ShortUrlModule } from '../short-url/short-url.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FormConfig.name, schema: FormConfigSchema },
      { name: FormField.name, schema: FormFieldSchema },
      { name: FormSubmission.name, schema: FormSubmissionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '720h' }, // 30天有效期
      }),
      inject: [ConfigService],
    }),
    ShortUrlModule,
    NotificationModule,
  ],
  controllers: [FormController],
  providers: [FormService, FormExportService],
  exports: [FormService, FormExportService],
})
export class FormModule {}

