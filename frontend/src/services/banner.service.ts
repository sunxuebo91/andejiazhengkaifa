import api from './api';

export interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  linkType: string;
  order: number;
  status: string;
  viewCount: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerDto {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
  order?: number;
  status?: string;
}

const bannerService = {
  // 获取列表
  async getList(params?: { page?: number; pageSize?: number; status?: string }) {
    const res = await api.get('/api/banners', { params });
    // res已经是 { success, data: { list, total, ... }, message }
    return res;
  },

  // 获取单个
  async getOne(id: string) {
    const res = await api.get(`/api/banners/${id}`);
    return res;
  },

  // 创建
  async create(data: CreateBannerDto) {
    const res = await api.post('/api/banners', data);
    return res;
  },

  // 更新
  async update(id: string, data: Partial<CreateBannerDto>) {
    const res = await api.patch(`/api/banners/${id}`, data);
    return res;
  },

  // 删除
  async remove(id: string) {
    const res = await api.delete(`/api/banners/${id}`);
    return res;
  },

  // 更新状态
  async updateStatus(id: string, status: string) {
    const res = await api.patch(`/api/banners/${id}/status`, { status });
    return res;
  },
};

export default bannerService;
