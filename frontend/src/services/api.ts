import request from '../utils/request';

export const api = {
  // 认证相关
  auth: {
    login: (data: { username: string; password: string }) => 
      request.post('/auth/login', data),
    logout: () => 
      request.post('/auth/logout'),
    getPermissions: () => 
      request.get('/auth/permissions'),
  },
  
  // 简历相关
  resumes: {
    getList: (params: any) => 
      request.get('/resumes', { params }),
    getDetail: (id: string) => 
      request.get(`/resumes/${id}`),
    create: (data: any) => 
      request.post('/resumes', data),
    update: (id: string, data: any) => 
      request.put(`/resumes/${id}`, data),
    delete: (id: string) => 
      request.delete(`/resumes/${id}`),
    addFollowUp: (resumeId: string, data: any) => 
      request.post(`/resumes/${resumeId}/follow-up`, data),
  },
  
  // 用户相关
  users: {
    getList: (params: any) => 
      request.get('/users', { params }),
    getDetail: (id: string) => 
      request.get(`/users/${id}`),
    create: (data: any) => 
      request.post('/users', data),
    update: (id: string, data: any) => 
      request.put(`/users/${id}`, data),
    delete: (id: string) => 
      request.delete(`/users/${id}`),
  },
  
  // OCR相关
  ocr: {
    recognizeIdCard: (file: File, side: 'front' | 'back' = 'front') => {
      const formData = new FormData();
      formData.append('file', file);
      return request.post(`/api/upload/id-card/${side}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    testConnection: () => 
      request.get('/api/upload/test-connection'),
  }
}; 