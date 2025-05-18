import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { notifySuccess, notifyError } from '../../utils/notification';

// 查询key前缀
export const resumeKeys = {
  all: ['resumes'] as const,
  lists: () => [...resumeKeys.all, 'list'] as const,
  list: (filters: any) => [...resumeKeys.lists(), filters] as const,
  details: () => [...resumeKeys.all, 'detail'] as const,
  detail: (id: string) => [...resumeKeys.details(), id] as const,
};

// 获取简历列表
export const useResumeList = (params: any = {}) => {
  return useQuery({
    queryKey: resumeKeys.list(params),
    queryFn: () => api.resumes.getList(params),
  });
};

// 获取简历详情
export const useResumeDetail = (id: string) => {
  return useQuery({
    queryKey: resumeKeys.detail(id),
    queryFn: () => api.resumes.getDetail(id),
    enabled: !!id, // 只有当id存在时才发起请求
  });
};

// 创建简历
export const useCreateResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.resumes.create(data),
    onSuccess: () => {
      notifySuccess('简历创建成功');
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error) => {
      notifyError(error.message || '简历创建失败');
    },
  });
};

// 更新简历
export const useUpdateResume = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.resumes.update(id, data),
    onSuccess: () => {
      notifySuccess('简历更新成功');
      queryClient.invalidateQueries({ queryKey: resumeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error) => {
      notifyError(error.message || '简历更新失败');
    },
  });
};

// 删除简历
export const useDeleteResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.resumes.delete(id),
    onSuccess: () => {
      notifySuccess('简历删除成功');
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error) => {
      notifyError(error.message || '简历删除失败');
    },
  });
};

// 添加跟进记录
export const useAddFollowUp = (resumeId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.resumes.addFollowUp(resumeId, data),
    onSuccess: () => {
      notifySuccess('添加跟进记录成功');
      queryClient.invalidateQueries({ queryKey: resumeKeys.detail(resumeId) });
    },
    onError: (error) => {
      notifyError(error.message || '添加跟进记录失败');
    },
  });
}; 