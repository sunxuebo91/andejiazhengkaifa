import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ObjectId } from 'mongodb';

@Injectable()
export class BaseService<T extends { id: string }> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * 创建实体
   */
  async create(createDto: any): Promise<T> {
    const id = new ObjectId().toString();
    const entity = this.repository.create({
      ...createDto,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    const result = await this.repository.save(entity);
    return Array.isArray(result) ? result[0] : result as T;
  }

  /**
   * 更新实体
   */
  async update(id: string, updateDto: any): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
    
    if (!entity) {
      throw new NotFoundException(`未找到ID为 ${id} 的记录`);
    }
    
    // 更新实体
    await this.repository.update(
      { id } as unknown as FindOptionsWhere<T>,
      {
        ...updateDto,
        updatedAt: new Date(),
      }
    );
    
    const updated = await this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
    
    if (!updated) {
      throw new NotFoundException(`更新后未找到ID为 ${id} 的记录`);
    }
    
    return updated;
  }

  /**
   * 删除实体
   */
  async remove(id: string): Promise<void> {
    const result = await this.repository.delete({ id } as unknown as FindOptionsWhere<T>);
    
    if (result.affected === 0) {
      throw new NotFoundException(`未找到ID为 ${id} 的记录`);
    }
  }

  /**
   * 查找单个实体
   */
  async findOne(id: string | object): Promise<T> {
    let entity: T | null;

    if (typeof id === 'string') {
      entity = await this.repository.findOne({
        where: { id } as unknown as FindOptionsWhere<T>,
      });
    } else {
      entity = await this.repository.findOne({
        where: id as unknown as FindOptionsWhere<T>,
      });
    }
    
    if (!entity) {
      throw new NotFoundException(`未找到记录`);
    }
    
    return entity;
  }

  /**
   * 查找多个实体
   */
  async findAll(options?: any): Promise<T[]> {
    return await this.repository.find(options);
  }

  /**
   * 分页查询
   */
  async findWithPagination(page = 1, pageSize = 10, where: any = {}): Promise<{ items: T[]; total: number; page: number; pageSize: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: where as unknown as FindOptionsWhere<T>,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    
    return {
      items,
      total,
      page,
      pageSize,
    };
  }
} 