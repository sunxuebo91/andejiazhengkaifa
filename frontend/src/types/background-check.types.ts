export interface BackgroundCheck {
  _id: string;
  reportId?: string;
  name: string;
  mobile: string;
  idNo?: string;
  position?: string;
  hrName?: string;
  stuffId?: string;
  authStuffUrl?: string;
  esignContractNo?: string;
  status: number;
  createdBy: string | { _id: string; name?: string; username?: string };
  callbackHistory: Array<{ notifyType: number; status: number; receivedAt: string }>;
  createdAt: string;
  updatedAt: string;
  contractId?: string | {
    _id: string;
    contractNumber: string;
    customerName: string;
    workerName: string;
    esignContractNo?: string;
  };
}

export const BG_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '待发起', color: 'default' },
  1: { text: '授权中', color: 'orange' },
  2: { text: '已催', color: 'orange' },
  3: { text: '已取消', color: 'red' },
  4: { text: '已完成', color: 'green' },
  5: { text: '已删除', color: 'red' },
  7: { text: '生成中', color: 'blue' },
  9: { text: '待补充信息', color: 'orange' },
  11: { text: '待复核', color: 'orange' },
  12: { text: '阶段版', color: 'blue' },
  13: { text: '进行中', color: 'blue' },
  14: { text: '暂停', color: 'orange' },
  15: { text: '终止', color: 'red' },
  16: { text: '已完成', color: 'green' },
};

export interface CreateReportData {
  stuffId: string;
  imageUrl: string;
  esignContractNo: string;
  name: string;
  mobile: string;
  idNo?: string;
  position?: string;
  packageType?: string; // 套餐类型: '1' = 标准版, '2' = 深度版
}
