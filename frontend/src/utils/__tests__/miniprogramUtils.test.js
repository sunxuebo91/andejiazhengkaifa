/**
 * 小程序工具函数测试用例
 * 文件: frontend/src/utils/__tests__/miniprogramUtils.test.js
 */

const {
  validateCustomerForm,
  isValidPhoneNumber,
  formatCustomerFormData,
  formatDate,
  formatRelativeTime,
  getCustomerStatusStyle,
  getLeadLevelStyle,
  handleApiError,
  debounce,
  throttle,
  deepClone,
  generateUniqueId,
  isEmpty,
  safeJsonParse,
  safeJsonStringify
} = require('../miniprogramUtils');

describe('MiniprogramUtils', () => {
  describe('validateCustomerForm', () => {
    it('应该验证必填字段', () => {
      const invalidData = {};
      const errors = validateCustomerForm(invalidData);

      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(errors.find(e => e.field === 'name')).toBeTruthy();
      expect(errors.find(e => e.field === 'phone')).toBeTruthy();
      expect(errors.find(e => e.field === 'wechatId')).toBeTruthy();
      expect(errors.find(e => e.field === 'leadSource')).toBeTruthy();
    });

    it('应该要求手机号或微信号至少填一个', () => {
      const noContactData = {
        name: '张三',
        leadSource: '美团',
        contractStatus: '匹配中',
        leadLevel: 'A类'
      };

      const errors = validateCustomerForm(noContactData);
      expect(errors.find(e => e.field === 'phone' && e.message === '请填写手机号或微信号')).toBeTruthy();
      expect(errors.find(e => e.field === 'wechatId' && e.message === '请填写手机号或微信号')).toBeTruthy();
    });

    it('应该通过只有手机号的验证', () => {
      const phoneOnlyData = {
        name: '张三',
        phone: '13812345678',
        leadSource: '美团',
        contractStatus: '匹配中',
        leadLevel: 'A类'
      };

      const errors = validateCustomerForm(phoneOnlyData);
      expect(errors).toHaveLength(0);
    });

    it('应该通过只有微信号的验证', () => {
      const wechatOnlyData = {
        name: '张三',
        wechatId: 'wechat123',
        leadSource: '美团',
        contractStatus: '匹配中',
        leadLevel: 'A类'
      };

      const errors = validateCustomerForm(wechatOnlyData);
      expect(errors).toHaveLength(0);
    });

    it('应该验证手机号格式', () => {
      const invalidPhoneData = {
        name: '张三',
        phone: '123456789',
        leadSource: '美团',
        contractStatus: '匹配中',
        leadLevel: 'A类'
      };

      const errors = validateCustomerForm(invalidPhoneData);
      expect(errors.find(e => e.field === 'phone' && e.message === '请输入有效的手机号码')).toBeTruthy();
    });

    it('应该验证数值范围', () => {
      const invalidRangeData = {
        name: '张三',
        phone: '13812345678',
        leadSource: '美团',
        contractStatus: '匹配中',
        leadLevel: 'A类',
        salaryBudget: 100, // 太小
        homeArea: 5, // 太小
        familySize: 25 // 太大
      };

      const errors = validateCustomerForm(invalidRangeData);
      expect(errors.find(e => e.field === 'salaryBudget')).toBeTruthy();
      expect(errors.find(e => e.field === 'homeArea')).toBeTruthy();
      expect(errors.find(e => e.field === 'familySize')).toBeTruthy();
    });

    it('应该通过有效数据验证', () => {
      const validData = {
        name: '张三',
        phone: '13812345678',
        leadSource: '美团',
        contractStatus: '匹配中',
        leadLevel: 'A类',
        salaryBudget: 8000,
        homeArea: 120,
        familySize: 4
      };

      const errors = validateCustomerForm(validData);
      expect(errors).toHaveLength(0);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('应该验证有效的手机号', () => {
      expect(isValidPhoneNumber('13812345678')).toBe(true);
      expect(isValidPhoneNumber('15987654321')).toBe(true);
      expect(isValidPhoneNumber('18612345678')).toBe(true);
    });

    it('应该拒绝无效的手机号', () => {
      expect(isValidPhoneNumber('12812345678')).toBe(false); // 不是1开头的有效号段
      expect(isValidPhoneNumber('1381234567')).toBe(false); // 长度不够
      expect(isValidPhoneNumber('138123456789')).toBe(false); // 长度过长
      expect(isValidPhoneNumber('13a12345678')).toBe(false); // 包含字母
      expect(isValidPhoneNumber('')).toBe(false); // 空字符串
    });

    it('应该处理空格', () => {
      expect(isValidPhoneNumber(' 13812345678 ')).toBe(true);
      expect(isValidPhoneNumber('138 1234 5678')).toBe(false); // 中间有空格
    });
  });

  describe('formatCustomerFormData', () => {
    it('应该格式化表单数据', () => {
      const rawData = {
        name: ' 张三 ',
        phone: ' 13812345678 ',
        wechatId: ' zhangsan123 ',
        salaryBudget: '8000',
        homeArea: '120',
        familySize: '4',
        remarks: ' 客户要求... '
      };

      const formatted = formatCustomerFormData(rawData);

      expect(formatted.name).toBe('张三');
      expect(formatted.phone).toBe('13812345678');
      expect(formatted.wechatId).toBe('zhangsan123');
      expect(formatted.salaryBudget).toBe(8000);
      expect(formatted.homeArea).toBe(120);
      expect(formatted.familySize).toBe(4);
      expect(formatted.remarks).toBe('客户要求...');
    });

    it('应该处理空值', () => {
      const rawData = {
        name: '',
        phone: '',
        salaryBudget: '',
        homeArea: null,
        familySize: undefined
      };

      const formatted = formatCustomerFormData(rawData);

      expect(formatted.name).toBe('');
      expect(formatted.phone).toBe('');
      expect(formatted.salaryBudget).toBeUndefined();
      expect(formatted.homeArea).toBeUndefined();
      expect(formatted.familySize).toBeUndefined();
    });
  });

  describe('formatDate', () => {
    it('应该格式化日期字符串', () => {
      const dateString = '2024-01-01T10:30:00.000Z';
      const formatted = formatDate(dateString);

      expect(formatted).toMatch(/2024\/01\/01/);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });

    it('应该处理无效日期', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('invalid-date');
      expect(formatDate(null)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock Date.now() 为固定时间
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01T12:00:00.000Z').getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('应该格式化相对时间', () => {
      // 1分钟前
      expect(formatRelativeTime('2024-01-01T11:59:00.000Z')).toBe('1分钟前');
      
      // 1小时前
      expect(formatRelativeTime('2024-01-01T11:00:00.000Z')).toBe('1小时前');
      
      // 1天前
      expect(formatRelativeTime('2023-12-31T12:00:00.000Z')).toBe('1天前');
      
      // 刚刚
      expect(formatRelativeTime('2024-01-01T11:59:30.000Z')).toBe('刚刚');
    });

    it('应该处理超过7天的日期', () => {
      const oldDate = '2023-12-20T12:00:00.000Z';
      const result = formatRelativeTime(oldDate);
      expect(result).toMatch(/2023/);
    });
  });

  describe('getCustomerStatusStyle', () => {
    it('应该返回正确的状态样式', () => {
      const signedStyle = getCustomerStatusStyle('已签约');
      expect(signedStyle.color).toBe('#52c41a');
      expect(signedStyle.backgroundColor).toBe('#f6ffed');

      const matchingStyle = getCustomerStatusStyle('匹配中');
      expect(matchingStyle.color).toBe('#1890ff');
      expect(matchingStyle.backgroundColor).toBe('#e6f7ff');

      const unknownStyle = getCustomerStatusStyle('未知状态');
      expect(unknownStyle.color).toBe('#8c8c8c');
      expect(unknownStyle.backgroundColor).toBe('#f5f5f5');
    });
  });

  describe('getLeadLevelStyle', () => {
    it('应该返回正确的等级样式', () => {
      const aLevelStyle = getLeadLevelStyle('A类');
      expect(aLevelStyle.color).toBe('#ff4d4f');
      expect(aLevelStyle.backgroundColor).toBe('#fff2f0');

      const unknownStyle = getLeadLevelStyle('未知等级');
      expect(unknownStyle.color).toBe('#8c8c8c');
      expect(unknownStyle.backgroundColor).toBe('#f5f5f5');
    });
  });

  describe('handleApiError', () => {
    it('应该处理不同类型的错误', () => {
      // 响应错误
      const responseError = {
        response: {
          data: {
            message: 'API错误信息'
          }
        }
      };
      expect(handleApiError(responseError)).toBe('API错误信息');

      // 普通错误对象
      const normalError = new Error('网络连接失败');
      expect(handleApiError(normalError)).toBe('网络连接失败');

      // 字符串错误
      expect(handleApiError('字符串错误')).toBe('字符串错误');

      // 未知错误
      expect(handleApiError({})).toBe('网络错误，请重试');
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('应该防抖函数调用', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('应该节流函数调用', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      jest.advanceTimersByTime(100);

      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });
  });

  describe('deepClone', () => {
    it('应该深拷贝对象', () => {
      const original = {
        name: '张三',
        info: {
          age: 30,
          hobbies: ['reading', 'swimming']
        },
        date: new Date('2024-01-01')
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.info).not.toBe(original.info);
      expect(cloned.info.hobbies).not.toBe(original.info.hobbies);
      expect(cloned.date).not.toBe(original.date);
    });

    it('应该处理基本类型', () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepClone(123)).toBe(123);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });
  });

  describe('generateUniqueId', () => {
    it('应该生成唯一ID', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();

      expect(id1).toMatch(/^\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('isEmpty', () => {
    it('应该正确判断空值', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);

      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ name: 'test' })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('应该安全解析JSON', () => {
      const validJson = '{"name": "张三", "age": 30}';
      const result = safeJsonParse(validJson, {});

      expect(result).toEqual({ name: '张三', age: 30 });
    });

    it('应该处理无效JSON', () => {
      const invalidJson = '{"name": "张三", "age":}';
      const defaultValue = { error: true };
      const result = safeJsonParse(invalidJson, defaultValue);

      expect(result).toEqual(defaultValue);
    });
  });

  describe('safeJsonStringify', () => {
    it('应该安全序列化对象', () => {
      const obj = { name: '张三', age: 30 };
      const result = safeJsonStringify(obj);

      expect(result).toBe('{"name":"张三","age":30}');
    });

    it('应该处理循环引用', () => {
      const obj = { name: '张三' };
      obj.self = obj; // 创建循环引用

      const result = safeJsonStringify(obj);
      expect(result).toBe('{}');
    });
  });
});
