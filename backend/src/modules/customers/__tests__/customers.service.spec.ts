import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomersService } from '../customers.service';
import { Customer, CustomerDocument } from '../models/customer.model';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let model: Model<CustomerDocument>;

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

  const mockModel = {
    new: jest.fn().mockResolvedValue(mockCustomer),
    constructor: jest.fn().mockResolvedValue(mockCustomer),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    model = module.get<Model<CustomerDocument>>(getModelToken(Customer.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      name: '张三',
      phone: '13800138000',
      leadSource: '美团',
      serviceCategory: '月嫂',
      leadLevel: 'A类',
      salaryBudget: 8000,
      expectedStartDate: '2024-02-01',
      homeArea: 120,
      familySize: 3,
      restSchedule: '单休',
      address: '北京市朝阳区某某小区',
    };

    it('should create a customer successfully', async () => {
      mockModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const mockSavedCustomer = { ...mockCustomer, save: jest.fn().mockResolvedValue(mockCustomer) };
      mockModel.new = jest.fn().mockImplementation(() => mockSavedCustomer);

      const result = await service.create(createCustomerDto, 'user123');

      expect(mockModel.findOne).toHaveBeenCalledWith({ phone: createCustomerDto.phone });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw ConflictException if phone already exists', async () => {
      mockModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      await expect(service.create(createCustomerDto, 'user123'))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return customers list with pagination', async () => {
      const mockQuery = { page: 1, limit: 10 };
      const mockCustomers = [mockCustomer];
      const mockTotal = 1;

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockCustomers),
            }),
          }),
        }),
      });

      mockModel.countDocuments = jest.fn().mockReturnValue({
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

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      mockModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');

      expect(mockModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('507f1f77bcf86cd799439011'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateData = { name: '李四' };

    it('should update a customer successfully', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateData };
      
      mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
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
      mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('507f1f77bcf86cd799439011', updateData))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a customer successfully', async () => {
      mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      await service.remove('507f1f77bcf86cd799439011');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('507f1f77bcf86cd799439011'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return customer statistics', async () => {
      const mockStats = {
        total: 10,
        byContractStatus: { '已签约': 5, '匹配中': 3, '待定': 2 },
        byLeadSource: { '美团': 4, '抖音': 3, '其他': 3 },
        byServiceCategory: { '月嫂': 6, '保洁': 4 },
      };

      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStats.total),
      });

      mockModel.aggregate = jest.fn()
        .mockResolvedValueOnce([
          { _id: '已签约', count: 5 },
          { _id: '匹配中', count: 3 },
          { _id: '待定', count: 2 },
        ])
        .mockResolvedValueOnce([
          { _id: '美团', count: 4 },
          { _id: '抖音', count: 3 },
          { _id: '其他', count: 3 },
        ])
        .mockResolvedValueOnce([
          { _id: '月嫂', count: 6 },
          { _id: '保洁', count: 4 },
        ]);

      const result = await service.getStatistics();

      expect(result).toEqual(mockStats);
    });
  });
}); 