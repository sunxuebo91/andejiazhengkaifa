// 学习意向映射
export const LEARNING_INTENTION_MAP: Record<string, string> = {
  'yuesao': '月嫂',
  'yuersao': '育儿嫂',
  'baomu': '保姆',
  'hulao': '护老'
} as const;

// 当前阶段映射
export const CURRENT_STAGE_MAP: Record<string, string> = {
  'experienced-certified': '有经验有证书',
  'experienced-no-cert': '有经验无证书',
  'certified-no-exp': '有证书无经验',
  'beginner': '小白',
  'not-looking': '不找工作'
} as const;

