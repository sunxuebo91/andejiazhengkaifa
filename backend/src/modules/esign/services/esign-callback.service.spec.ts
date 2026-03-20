import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ESignCallbackService } from './esign-callback.service';
import { ESignApiService } from './esign-api.service';
import { Contract } from '../../contracts/models/contract.model';
import { Customer } from '../../customers/models/customer.model';
import { CustomersService } from '../../customers/customers.service';
import { NotificationGateway } from '../../notification/notification.gateway';

describe('ESignCallbackService.verifyCallback', () => {
  let service: ESignCallbackService;
  let mockApiService: { config: { publicKey: string | null } };

  beforeEach(async () => {
    mockApiService = { config: { publicKey: null } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ESignCallbackService,
        { provide: ESignApiService, useValue: mockApiService },
        { provide: getModelToken(Contract.name), useValue: {} },
        { provide: getModelToken(Customer.name), useValue: {} },
        { provide: CustomersService, useValue: {} },
        { provide: NotificationGateway, useValue: {} },
      ],
    }).compile();

    service = module.get<ESignCallbackService>(ESignCallbackService);
  });

  describe('未配置公钥', () => {
    it('公钥为空字符串时应放行（当前行为，存在安全风险 A5）', () => {
      mockApiService.config.publicKey = '';
      const result = service.verifyCallback('any-sig', '1234567890', '{}');
      // ⚠️ 当前行为：未配置公钥时返回 true（放行）
      // TODO A5: 后续应改为 false（拒绝）待现网回调链路确认后执行
      expect(result).toBe(true);
    });

    it('公钥为 null 时应放行（当前行为，存在安全风险 A5）', () => {
      mockApiService.config.publicKey = null as any;
      const result = service.verifyCallback('any-sig', '1234567890', '{}');
      expect(result).toBe(true);
    });
  });

  describe('已配置公钥', () => {
    it('签名无效时应返回 false', () => {
      // 使用一个合法的 RSA 公钥格式，但签名是伪造的
      mockApiService.config.publicKey = [
        '-----BEGIN PUBLIC KEY-----',
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a2rwplBQLF29amygykE',
        'MmYz0+Kcj3bKBp29wNi7K5tFKnLGFWpMGE7YQzEsEDEoFhBGdMB8Y3oMDHpDTGF',
        'IQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQ',
        'IDAQAB',
        '-----END PUBLIC KEY-----',
      ].join('\n');

      const result = service.verifyCallback('invalid-base64-sig', '1234567890', '{"test":1}');
      expect(result).toBe(false);
    });

    it('签名格式异常时应返回 false 而非抛出异常', () => {
      mockApiService.config.publicKey = '-----BEGIN PUBLIC KEY-----\nINVALID\n-----END PUBLIC KEY-----';
      expect(() => {
        const result = service.verifyCallback('bad-sig', 'ts', 'body');
        expect(result).toBe(false);
      }).not.toThrow();
    });
  });
});
