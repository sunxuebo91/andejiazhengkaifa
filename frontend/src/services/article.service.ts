import apiService from './api';

export interface Article {
  _id: string;
  title?: string;
  author?: string;
  source?: string;
  contentRaw?: string;
  contentHtml?: string;
  imageUrls?: string[];
  status: 'draft' | 'published' | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleDto {
  title?: string;
  author?: string;
  source?: string;
  contentRaw: string;
  imageUrls?: string[];
  status?: 'draft' | 'published';
}

const articleService = {
  async getList(params?: { page?: number; pageSize?: number; status?: string; keyword?: string }) {
    return apiService.get('/api/articles', params);
  },

  async getOne(id: string) {
    return apiService.get(`/api/articles/${id}`);
  },

  async create(data: CreateArticleDto) {
    return apiService.post('/api/articles', data);
  },

  async update(id: string, data: Partial<CreateArticleDto>) {
    return apiService.patch(`/api/articles/${id}`, data);
  },

  async remove(id: string) {
    return apiService.delete(`/api/articles/${id}`);
  },

  async updateStatus(id: string, status: 'draft' | 'published') {
    return apiService.patch(`/api/articles/${id}/status`, { status });
  },
};

export default articleService;
