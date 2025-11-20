import { Test, TestingModule } from '@nestjs/testing';
import { ZegoService } from './zego.service';
import { ConfigService } from '@nestjs/config';

describe('ZegoService - Auto Room Cleanup', () => {
  let service: ZegoService;
  let mockInterviewService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZegoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ZEGO_APP_ID') return '1279160453';
              if (key === 'ZEGO_SERVER_SECRET') return 'test_secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ZegoService>(ZegoService);

    // 创建 mock InterviewService
    mockInterviewService = {
      autoEndRoom: jest.fn().mockResolvedValue(undefined),
    };

    // 设置 InterviewService
    service.setInterviewService(mockInterviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call autoEndRoom when room is empty for 10 minutes', async () => {
    const roomId = 'test_room_123';
    const userId = 'user_host';

    // 1. 创建房间
    service.createRoom(roomId, userId);

    // 2. 用户加入
    service.joinRoom(roomId, userId);

    // 3. 用户离开（房间变为无人状态）
    service.leaveRoom(roomId, userId);

    // 4. 模拟时间流逝（超过10分钟）
    jest.useFakeTimers();
    jest.advanceTimersByTime(11 * 60 * 1000); // 11分钟

    // 5. 等待清理任务执行
    await Promise.resolve();

    // 6. 验证 autoEndRoom 被调用
    expect(mockInterviewService.autoEndRoom).toHaveBeenCalledWith(roomId);

    jest.useRealTimers();
  });

  it('should not call autoEndRoom if room still has participants', async () => {
    const roomId = 'test_room_456';
    const userId1 = 'user_host';
    const userId2 = 'user_guest';

    // 1. 创建房间
    service.createRoom(roomId, userId1);

    // 2. 两个用户加入
    service.joinRoom(roomId, userId1);
    service.joinRoom(roomId, userId2);

    // 3. 只有一个用户离开
    service.leaveRoom(roomId, userId1);

    // 4. 模拟时间流逝（超过10分钟）
    jest.useFakeTimers();
    jest.advanceTimersByTime(11 * 60 * 1000);

    // 5. 等待清理任务执行
    await Promise.resolve();

    // 6. 验证 autoEndRoom 不应该被调用（因为还有用户在房间里）
    expect(mockInterviewService.autoEndRoom).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

