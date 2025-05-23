import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import CreateResume from '../CreateResume';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock URL.createObjectURL
window.URL.createObjectURL = jest.fn(() => 'mock-url');

// Mock dayjs
jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  return {
    ...actual,
    __esModule: true,
    default: jest.fn(() => ({
      format: jest.fn(() => '2024-01-01'),
      diff: jest.fn(() => 30),
    })),
  };
});

// 包装组件
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <App>
        {ui}
      </App>
    </BrowserRouter>
  );
};

describe('CreateResume 组件', () => {
  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();
    // 模拟后端连接成功
    mockedAxios.get.mockResolvedValue({ data: [] });
  });

  describe('基本渲染测试', () => {
    it('应该正确渲染创建简历页面', () => {
      renderWithRouter(<CreateResume />);
      
      // 检查页面标题
      expect(screen.getByText('创建简历')).toBeInTheDocument();
      
      // 检查主要表单字段
      expect(screen.getByLabelText('姓名')).toBeInTheDocument();
      expect(screen.getByLabelText('年龄')).toBeInTheDocument();
      expect(screen.getByLabelText('手机号码')).toBeInTheDocument();
      expect(screen.getByLabelText('性别')).toBeInTheDocument();
      expect(screen.getByLabelText('籍贯')).toBeInTheDocument();
      expect(screen.getByLabelText('工种')).toBeInTheDocument();
    });
  });

  describe('表单验证测试', () => {
    it('应该验证必填字段', async () => {
      renderWithRouter(<CreateResume />);
      
      // 尝试提交空表单
      const submitButton = screen.getByText('创建简历');
      await userEvent.click(submitButton);
      
      // 检查错误消息
      await waitFor(() => {
        expect(screen.getByText('请输入姓名')).toBeInTheDocument();
        expect(screen.getByText('请输入年龄')).toBeInTheDocument();
        expect(screen.getByText('请输入手机号码')).toBeInTheDocument();
        expect(screen.getByText('请选择性别')).toBeInTheDocument();
        expect(screen.getByText('请选择籍贯')).toBeInTheDocument();
        expect(screen.getByText('请选择工种')).toBeInTheDocument();
      });
    });

    it('应该验证手机号格式', async () => {
      renderWithRouter(<CreateResume />);
      
      const phoneInput = screen.getByLabelText('手机号码');
      await userEvent.type(phoneInput, '12345678901');
      
      // 触发验证
      fireEvent.blur(phoneInput);
      
      await waitFor(() => {
        expect(screen.getByText('请输入正确的手机号码')).toBeInTheDocument();
      });
    });

    it('应该验证年龄范围', async () => {
      renderWithRouter(<CreateResume />);
      
      const ageInput = screen.getByLabelText('年龄');
      await userEvent.type(ageInput, '15');
      
      // 触发验证
      fireEvent.blur(ageInput);
      
      await waitFor(() => {
        expect(screen.getByText('年龄必须大于等于18岁')).toBeInTheDocument();
      });
    });
  });

  describe('文件上传测试', () => {
    it('应该处理身份证上传', async () => {
      renderWithRouter(<CreateResume />);
      
      // 模拟文件
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // 获取上传按钮
      const uploadButton = screen.getByText('上传身份证正面');
      const input = uploadButton.parentElement?.querySelector('input');
      
      if (input) {
        await userEvent.upload(input, file);
      }
      
      // 验证上传请求
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
    });

    it('应该处理多文件上传', async () => {
      renderWithRouter(<CreateResume />);
      
      // 模拟多个文件
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      
      // 获取上传按钮
      const uploadButton = screen.getByText('上传个人照片');
      const input = uploadButton.parentElement?.querySelector('input');
      
      if (input) {
        await userEvent.upload(input, files);
      }
      
      // 验证上传请求
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledTimes(files.length);
      });
    });
  });

  describe('表单提交测试', () => {
    it('应该成功提交表单', async () => {
      // 模拟成功的API响应
      mockedAxios.post.mockResolvedValueOnce({ data: { id: '123', success: true } });
      
      renderWithRouter(<CreateResume />);
      
      // 填写表单
      await userEvent.type(screen.getByLabelText('姓名'), '张三');
      await userEvent.type(screen.getByLabelText('年龄'), '30');
      await userEvent.type(screen.getByLabelText('手机号码'), '13800138000');
      
      // 选择下拉选项
      const genderSelect = screen.getByLabelText('性别');
      await userEvent.click(genderSelect);
      await userEvent.click(screen.getByText('男'));
      
      const nativePlaceSelect = screen.getByLabelText('籍贯');
      await userEvent.click(nativePlaceSelect);
      await userEvent.click(screen.getByText('北京市'));
      
      const jobTypeSelect = screen.getByLabelText('工种');
      await userEvent.click(jobTypeSelect);
      await userEvent.click(screen.getByText('月嫂'));
      
      // 提交表单
      const submitButton = screen.getByText('创建简历');
      await userEvent.click(submitButton);
      
      // 验证提交
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/resumes', expect.any(Object));
        expect(mockNavigate).toHaveBeenCalledWith('/aunt/resume/123');
      });
    });

    it('应该处理提交错误', async () => {
      // 模拟API错误
      mockedAxios.post.mockRejectedValueOnce(new Error('提交失败'));
      
      renderWithRouter(<CreateResume />);
      
      // 填写必要字段
      await userEvent.type(screen.getByLabelText('姓名'), '张三');
      await userEvent.type(screen.getByLabelText('年龄'), '30');
      await userEvent.type(screen.getByLabelText('手机号码'), '13800138000');
      
      // 选择必要选项
      const genderSelect = screen.getByLabelText('性别');
      await userEvent.click(genderSelect);
      await userEvent.click(screen.getByText('男'));
      
      const nativePlaceSelect = screen.getByLabelText('籍贯');
      await userEvent.click(nativePlaceSelect);
      await userEvent.click(screen.getByText('北京市'));
      
      const jobTypeSelect = screen.getByLabelText('工种');
      await userEvent.click(jobTypeSelect);
      await userEvent.click(screen.getByText('月嫂'));
      
      // 提交表单
      const submitButton = screen.getByText('创建简历');
      await userEvent.click(submitButton);
      
      // 验证错误处理
      await waitFor(() => {
        expect(screen.getByText('创建失败，请检查网络连接')).toBeInTheDocument();
      });
    });
  });

  describe('编辑模式测试', () => {
    const mockResumeData = {
      id: '123',
      name: '张三',
      age: 30,
      phone: '13800138000',
      gender: 'male',
      nativePlace: '北京市',
      jobType: 'yuexin',
      education: 'college',
      experienceYears: 5,
      idCardFrontUrl: 'http://example.com/front.jpg',
      idCardBackUrl: 'http://example.com/back.jpg',
    };

    beforeEach(() => {
      // 模拟编辑模式
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockResumeData));
      window.location.href = 'http://localhost/edit=true';
    });

    it('应该在编辑模式下正确加载数据', async () => {
      renderWithRouter(<CreateResume />);
      
      // 验证表单数据
      await waitFor(() => {
        expect(screen.getByDisplayValue('张三')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
        expect(screen.getByDisplayValue('13800138000')).toBeInTheDocument();
      });
      
      // 验证页面标题
      expect(screen.getByText('编辑简历')).toBeInTheDocument();
    });

    it('应该成功更新简历', async () => {
      // 模拟成功的更新响应
      mockedAxios.put.mockResolvedValueOnce({ data: { id: '123', success: true } });
      
      renderWithRouter(<CreateResume />);
      
      // 修改数据
      const nameInput = screen.getByLabelText('姓名');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '李四');
      
      // 提交更新
      const submitButton = screen.getByText('保存更新');
      await userEvent.click(submitButton);
      
      // 验证更新请求
      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith('/api/resumes/123', expect.any(Object));
        expect(mockNavigate).toHaveBeenCalledWith('/aunt/resume/123');
      });
    });
  });
}); 