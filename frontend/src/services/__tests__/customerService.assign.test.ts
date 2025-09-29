import { customerService } from '../customerService';
import { apiService } from '../api';

jest.mock('../api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('customerService.assignCustomer', () => {
  it('calls PATCH /api/customers/:id/assign with payload and returns data', async () => {
    const mockData = { _id: 'c1', assignedTo: 'u2' } as any;
    (apiService.patch as jest.Mock).mockResolvedValue({ data: mockData });

    const res = await customerService.assignCustomer('c1', 'u2', 'reason');

    expect(apiService.patch).toHaveBeenCalledWith('/api/customers/c1/assign', {
      assignedTo: 'u2',
      assignmentReason: 'reason',
    });
    expect(res).toBe(mockData);
  });
});

