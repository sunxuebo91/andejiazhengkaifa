import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AssignCustomerModal from '../../components/AssignCustomerModal';
import { customerService } from '../../services/customerService';

jest.mock('../../services/customerService', () => ({
  customerService: {
    getAssignableUsers: jest.fn(),
    assignCustomer: jest.fn(),
  },
}));

describe('AssignCustomerModal', () => {
  const onCancel = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads users on open and submits assignment', async () => {
    (customerService.getAssignableUsers as jest.Mock).mockResolvedValue([
      { _id: 'u1', name: '张三', username: 'zhangsan', role: 'employee' },
      { _id: 'u2', name: '李四', username: 'lisi', role: 'manager' },
    ]);
    (customerService.assignCustomer as jest.Mock).mockResolvedValue({});

    render(
      <AssignCustomerModal visible={true} customerId={"c1"} onCancel={onCancel} onSuccess={onSuccess} />
    );

    // 等待下拉选项加载
    await waitFor(() => expect(customerService.getAssignableUsers).toHaveBeenCalled());

    // 选择负责人
    const selector = screen.getByRole('combobox');
    fireEvent.mouseDown(selector);
    // 选第一个选项
    const option = await screen.findByText(/张三/);
    fireEvent.click(option);

    // 输入备注
    const textarea = screen.getByRole('textbox', { name: /分配备注/ });
    fireEvent.change(textarea, { target: { value: '测试备注' } });

    // 确认提交
    const okBtn = screen.getByRole('button', { name: '确认分配' });
    fireEvent.click(okBtn);

    await waitFor(() => expect(customerService.assignCustomer).toHaveBeenCalledWith('c1', 'u1', '测试备注'));
    expect(onSuccess).toHaveBeenCalled();
  });
});

