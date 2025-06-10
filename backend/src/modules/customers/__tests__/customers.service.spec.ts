import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CustomersService } from '../customers.service';
import { Customer } from '../models/customer.model';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockModel: any;

  const mockCustomer = {
    _id: '507f1f77bcf86cd799439011',
    customerId: 'CUS12345678001',
    name: '张三',
    phone: '13800138000',
    leadSource: '美团',
    serviceCategory: '月嫂',
    contractStatus: '待定',
    leadLevel: 'A类',
    salaryBudget: 8000,
    expectedStartDate: new Date('2024-02-01'),
    homeArea: 120,
    familySize: 3,
    restSchedule: '单休',
    address: '北京市朝阳区某某小区',
    createdBy: 'user123',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    mockModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken(Customer.name),
          useValue: jest.fn().mockImplementation(() => ({
            ...mockCustomer,
            save: jest.fn().mockResolvedValue(mockCustomer),
          })),
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    
    // 重新设置mockModel到service中
    Object.assign(service as any, { customerModel: mockModel });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');

      expect(mockModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('507f1f77bcf86cd799439011'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return customers list with pagination', async () => {
      const mockQuery = { page: 1, limit: 10 };
      const mockCustomers = [mockCustomer];
      const mockTotal = 1;

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockCustomers),
            }),
          }),
        }),
      });

      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTotal),
      });

      const result = await service.findAll(mockQuery);

      expect(result).toEqual({
        customers: mockCustomers,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    const updateData = { name: '李四' };

    it('should update a customer successfully', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateData };
      
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCustomer),
      });

      const result = await service.update('507f1f77bcf86cd799439011', updateData);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateData,
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('507f1f77bcf86cd799439011', updateData))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a customer successfully', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      await service.remove('507f1f77bcf86cd799439011');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('507f1f77bcf86cd799439011'))
        .rejects.toThrow(NotFoundException);
    });
  });
}); 