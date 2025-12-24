/**
 * 统一的错误处理工具函数
 * 用于从各种错误对象中提取有意义的错误信息
 */

/**
 * 从错误对象中提取错误消息
 * @param error - 错误对象（可能是 AxiosError、Error 或其他类型）
 * @param defaultMessage - 默认错误消息
 * @returns 提取的错误消息字符串
 */
export const extractErrorMessage = (error: any, defaultMessage: string = '操作失败'): string => {
  // 调试日志
  console.log('extractErrorMessage 收到的错误对象:', error);

  // 1. 尝试从 axios 响应中获取错误消息
  const responseData = error?.response?.data;
  if (responseData) {
    // 1.1 直接从 message 字段获取（优先）
    if (responseData.message && typeof responseData.message === 'string' && responseData.message !== 'Bad Request') {
      console.log('从 response.data.message 获取:', responseData.message);
      return responseData.message;
    }

    // 1.2 从 error.details.message 获取（验证错误的情况）
    if (responseData.error?.details?.message) {
      const detailsMessage = responseData.error.details.message;
      if (Array.isArray(detailsMessage)) {
        const msg = detailsMessage.join('; ');
        console.log('从 error.details.message 数组获取:', msg);
        return msg;
      }
      if (typeof detailsMessage === 'string' && detailsMessage !== 'Bad Request') {
        console.log('从 error.details.message 字符串获取:', detailsMessage);
        return detailsMessage;
      }
    }

    // 1.3 如果 message 是数组（NestJS 验证错误）
    if (Array.isArray(responseData.message)) {
      const msg = responseData.message.join('; ');
      console.log('从 response.data.message 数组获取:', msg);
      return msg;
    }
  }

  // 2. 尝试从 Error 对象的 message 属性获取
  if (error?.message && typeof error.message === 'string') {
    // 过滤掉无意义的通用错误消息
    const genericMessages = ['Bad Request', 'Request failed with status code 400', 'Network Error'];
    if (!genericMessages.some(gm => error.message.includes(gm))) {
      console.log('从 error.message 获取:', error.message);
      return error.message;
    }
  }

  // 3. 如果错误本身是字符串
  if (typeof error === 'string') {
    console.log('错误本身是字符串:', error);
    return error;
  }

  // 4. 尝试将错误对象转换为字符串
  if (error && typeof error.toString === 'function') {
    const errorStr = error.toString();
    // 避免返回无意义的 "[object Object]" 或 "Error: Bad Request"
    if (errorStr !== '[object Object]' && !errorStr.includes('Bad Request')) {
      console.log('从 error.toString() 获取:', errorStr);
      return errorStr;
    }
  }

  // 5. 返回默认消息
  console.log('使用默认消息:', defaultMessage);
  return defaultMessage;
};

/**
 * 获取详细的错误信息（用于调试）
 * @param error - 错误对象
 * @returns 包含详细错误信息的对象
 */
export const getDetailedErrorInfo = (error: any): {
  message: string;
  status?: number;
  statusText?: string;
  code?: string;
  details?: any;
} => {
  const info: any = {
    message: extractErrorMessage(error),
  };

  // 添加 HTTP 状态信息
  if (error?.response?.status) {
    info.status = error.response.status;
    info.statusText = error.response.statusText;
  }

  // 添加错误代码
  if (error?.response?.data?.error?.code) {
    info.code = error.response.data.error.code;
  } else if (error?.code) {
    info.code = error.code;
  }

  // 添加详细信息
  if (error?.response?.data?.error?.details) {
    info.details = error.response.data.error.details;
  }

  return info;
};

/**
 * 判断是否为网络错误
 * @param error - 错误对象
 * @returns 是否为网络错误
 */
export const isNetworkError = (error: any): boolean => {
  return (
    error?.code === 'ERR_NETWORK' ||
    error?.message?.includes('Network Error') ||
    error?.message?.includes('网络错误') ||
    !error?.response
  );
};

/**
 * 判断是否为认证错误
 * @param error - 错误对象
 * @returns 是否为认证错误
 */
export const isAuthError = (error: any): boolean => {
  return (
    error?.response?.status === 401 ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('认证失败')
  );
};

/**
 * 判断是否为权限错误
 * @param error - 错误对象
 * @returns 是否为权限错误
 */
export const isPermissionError = (error: any): boolean => {
  return (
    error?.response?.status === 403 ||
    error?.message?.includes('Forbidden') ||
    error?.message?.includes('权限不足')
  );
};

/**
 * 判断是否为验证错误
 * @param error - 错误对象
 * @returns 是否为验证错误
 */
export const isValidationError = (error: any): boolean => {
  return (
    error?.response?.status === 400 ||
    error?.response?.data?.error?.code?.includes('VALIDATION')
  );
};

