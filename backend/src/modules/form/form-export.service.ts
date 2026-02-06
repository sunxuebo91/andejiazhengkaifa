import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { FormConfig, FormConfigDocument } from './models/form-config.model';
import { FormField, FormFieldDocument } from './models/form-field.model';
import { FormSubmission, FormSubmissionDocument } from './models/form-submission.model';

@Injectable()
export class FormExportService {
  private readonly logger = new Logger(FormExportService.name);

  constructor(
    @InjectModel(FormConfig.name) private formConfigModel: Model<FormConfigDocument>,
    @InjectModel(FormField.name) private formFieldModel: Model<FormFieldDocument>,
    @InjectModel(FormSubmission.name) private formSubmissionModel: Model<FormSubmissionDocument>,
  ) {}

  /**
   * 导出表单提交数据为Excel
   */
  async exportToExcel(formId: string): Promise<Buffer> {
    this.logger.log(`导出表单数据: ${formId}`);

    // 获取表单信息
    const form = await this.formConfigModel.findById(formId);
    if (!form) {
      throw new NotFoundException(`表单不存在`);
    }

    // 获取表单字段
    const fields = await this.formFieldModel
      .find({ formId: new Types.ObjectId(formId) })
      .sort({ order: 1 })
      .exec();

    // 获取所有提交记录
    const submissions = await this.formSubmissionModel
      .find({ formId: new Types.ObjectId(formId) })
      .sort({ createdAt: -1 })
      .populate('followUpBy', 'name username')
      .exec();

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(form.title);

    // 设置列
    const columns: any[] = [
      { header: '提交时间', key: 'createdAt', width: 20 },
    ];

    // 添加表单字段列
    fields.forEach((field) => {
      columns.push({
        header: field.label,
        key: field.fieldName,
        width: 20,
      });
    });

    // 添加额外信息列
    columns.push(
      { header: '提交来源', key: 'source', width: 15 },
      { header: 'IP地址', key: 'ipAddress', width: 20 },
      { header: '跟进状态', key: 'followUpStatus', width: 15 },
      { header: '跟进备注', key: 'followUpNote', width: 30 },
      { header: '跟进人', key: 'followUpBy', width: 15 },
      { header: '跟进时间', key: 'followUpAt', width: 20 },
    );

    worksheet.columns = columns;

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 添加数据行
    submissions.forEach((submission) => {
      const row: any = {
        createdAt: this.formatDate(submission.createdAt),
        source: this.getSourceLabel(submission.source),
        ipAddress: submission.ipAddress || '-',
        followUpStatus: this.getFollowUpStatusLabel(submission.followUpStatus),
        followUpNote: submission.followUpNote || '-',
        followUpBy: submission.followUpBy ? (submission.followUpBy as any).name : '-',
        followUpAt: submission.followUpAt ? this.formatDate(submission.followUpAt) : '-',
      };

      // 添加表单字段数据
      fields.forEach((field) => {
        const value = submission.data[field.fieldName];
        row[field.fieldName] = this.formatFieldValue(value, field.fieldType);
      });

      worksheet.addRow(row);
    });

    // 生成Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * 格式化字段值
   */
  private formatFieldValue(value: any, fieldType: string): string {
    if (value === null || value === undefined) return '-';

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 获取来源标签
   */
  private getSourceLabel(source: string): string {
    const labels = {
      h5: 'H5页面',
      miniprogram: '小程序',
      web: 'Web端',
    };
    return labels[source] || source;
  }

  /**
   * 获取跟进状态标签
   */
  private getFollowUpStatusLabel(status: string): string {
    const labels = {
      pending: '待跟进',
      contacted: '已联系',
      completed: '已完成',
    };
    return labels[status] || status;
  }
}

