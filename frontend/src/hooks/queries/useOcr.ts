import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { notifyError } from '../../utils/notification';

export const ocrKeys = {
  connection: ['ocr', 'connection'] as const,
};

// 识别身份证
export const useRecognizeIdCard = () => {
  return useMutation({
    mutationFn: (file: File) => api.ocr.recognizeIdCard(file),
    onError: (error) => {
      notifyError(error.message || '身份证识别失败，请重试');
    },
  });
};

// 测试OCR连接
export const useTestOcrConnection = () => {
  return useQuery({
    queryKey: ocrKeys.connection,
    queryFn: () => api.ocr.testConnection(),
    // 1分钟缓存，避免频繁请求
    staleTime: 60 * 1000,
    // 出错时不重试
    retry: 0,
    // 如果测试失败，30秒后再次尝试
    refetchInterval: (data) => (data ? false : 30 * 1000),
  });
}; 