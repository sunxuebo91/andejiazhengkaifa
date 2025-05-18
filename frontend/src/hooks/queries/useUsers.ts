import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { notifySuccess, notifyError } from '../../utils/notification';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: any) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// 获取用户列表
export const useUserList = (params: any = {}) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => api.users.getList(params),
  });
};

// 获取用户详情
export const useUserDetail = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.users.getDetail(id),
    enabled: !!id,
  });
};

// 创建用户
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.users.create(data),
    onSuccess: () => {
      notifySuccess('用户创建成功');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      notifyError(error.message || '用户创建失败');
    },
  });
};

// 更新用户
export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.users.update(id, data),
    onSuccess: () => {
      notifySuccess('用户更新成功');
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      notifyError(error.message || '用户更新失败');
    },
  });
};

// 删除用户
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      notifySuccess('用户删除成功');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      notifyError(error.message || '用户删除失败');
    },
  });
}; 