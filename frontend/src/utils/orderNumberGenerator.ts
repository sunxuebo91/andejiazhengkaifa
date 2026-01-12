/**
 * 生成工作订单号（与合同编号格式一致）
 * 格式: CON{timestamp后8位}{3位随机数}
 * 例如: CON123456789012
 * @returns 订单号字符串
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CON${timestamp.slice(-8)}${random}`;
};

/**
 * 验证订单号格式
 * @param orderNumber 订单号
 * @returns 是否有效
 */
export const validateOrderNumber = (orderNumber: string): boolean => {
  // 格式: CON{8位数字}{3位数字}
  const pattern = /^CON\d{11}$/;
  return pattern.test(orderNumber);
};

