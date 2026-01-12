/**
 * 北京市行政区划列表
 */
export const BEIJING_DISTRICTS = [
  { value: 'dongcheng', label: '东城区' },
  { value: 'xicheng', label: '西城区' },
  { value: 'chaoyang', label: '朝阳区' },
  { value: 'haidian', label: '海淀区' },
  { value: 'fengtai', label: '丰台区' },
  { value: 'shijingshan', label: '石景山区' },
  { value: 'tongzhou', label: '通州区' },
  { value: 'shunyi', label: '顺义区' },
  { value: 'changping', label: '昌平区' },
  { value: 'daxing', label: '大兴区' },
  { value: 'fangshan', label: '房山区' },
  { value: 'mentougou', label: '门头沟区' },
  { value: 'pinggu', label: '平谷区' },
  { value: 'huairou', label: '怀柔区' },
  { value: 'miyun', label: '密云区' },
  { value: 'yanqing', label: '延庆区' },
] as const;

/**
 * 区域值到标签的映射
 */
export const DISTRICT_MAP: Record<string, string> = BEIJING_DISTRICTS.reduce(
  (acc, district) => {
    acc[district.value] = district.label;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * 获取区域标签
 * @param value 区域值
 * @returns 区域标签
 */
export const getDistrictLabel = (value: string): string => {
  return DISTRICT_MAP[value] || value;
};

