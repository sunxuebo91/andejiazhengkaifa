import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileInfoDocument = FileInfoSchema & Document;

@Schema({ _id: false })
export class FileInfoSchema {
  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  filename: string;

  @Prop({ type: Number, required: false })
  size: number;

  @Prop({ type: String, required: false })
  mimetype: string;
}

export const FileInfoSchemaFactory = SchemaFactory.createForClass(FileInfoSchema); 