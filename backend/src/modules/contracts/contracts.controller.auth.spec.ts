import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ESignService } from '../esign/esign.service';
import { ContractApprovalsService } from '../contract-approvals/contract-approvals.service';

const mockContract = (createdBy: any) => ({
  _id: 'contract-id-1',
  contractNumber: 'CN001',
  esignContractNo: null,
  createdBy,
  toString: () => 'contract-id-1',
});

describe('ContractsController - 资源级鉴权 (A8)', () => {
  let controller: ContractsController;
  let contractsService: { findOne: jest.Mock };

  const adminUser = { userId: 'admin-001', role: 'admin' };
  const managerUser = { userId: 'mgr-001', role: '经理' };
  const ownerEmployee = { userId: 'emp-001', role: 'employee', username: 'emp001', name: '员工A' };
  const otherEmployee = { userId: 'emp-002', role: 'employee', username: 'emp002', name: '员工B' };

  beforeEach(async () => {
    contractsService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        { provide: ContractsService, useValue: contractsService },
        { provide: ESignService, useValue: {} },
        { provide: ContractApprovalsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
  });

  describe('findOne', () => {
    it('管理员可访问任意合同', async () => {
      contractsService.findOne.mockResolvedValue(mockContract('emp-001'));
      const result = await controller.findOne('contract-id-1', { user: adminUser });
      expect(result.success).toBe(true);
    });

    it('经理可访问任意合同', async () => {
      contractsService.findOne.mockResolvedValue(mockContract('emp-001'));
      const result = await controller.findOne('contract-id-1', { user: managerUser });
      expect(result.success).toBe(true);
    });

    it('普通员工可访问自己创建的合同', async () => {
      contractsService.findOne.mockResolvedValue(mockContract('emp-001'));
      const result = await controller.findOne('contract-id-1', { user: ownerEmployee });
      expect(result.success).toBe(true);
    });

    it('普通员工可访问自己创建的合同（createdBy 为 populated 对象）', async () => {
      contractsService.findOne.mockResolvedValue(mockContract({ _id: 'emp-001', name: '员工A' } as any));
      const result = await controller.findOne('contract-id-1', { user: ownerEmployee });
      expect(result.success).toBe(true);
    });

    it('普通员工可访问自己创建的合同（createdBy 为用户名字符串）', async () => {
      contractsService.findOne.mockResolvedValue(mockContract('emp001'));
      const result = await controller.findOne('contract-id-1', { user: ownerEmployee });
      expect(result.success).toBe(true);
    });

    it('普通员工可访问自己创建的合同（createdBy 为 populated 用户对象且仅含 username）', async () => {
      contractsService.findOne.mockResolvedValue(mockContract({ username: 'emp001' } as any));
      const result = await controller.findOne('contract-id-1', { user: ownerEmployee });
      expect(result.success).toBe(true);
    });

    it('普通员工无法访问他人创建的合同', async () => {
      contractsService.findOne.mockResolvedValue(mockContract('emp-001'));
      const result = await controller.findOne('contract-id-1', { user: otherEmployee });
      expect(result.success).toBe(false);
      expect(result.message).toContain('无权限');
    });
  });
});
