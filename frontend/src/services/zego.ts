import { apiService } from './api';

export interface GenerateTokenParams {
  userId: string;
  roomId: string;
  userName: string;
  expireTime?: number;
}

export interface GenerateTokenData {
  token: string;
  appId: number;
}

export interface ZegoConfigData {
  appId: number;
}

/**
 * 生成 ZEGO Kit Token
 */
export const generateZegoToken = async (
  params: GenerateTokenParams
) => {
  return await apiService.post<GenerateTokenData>(
    '/api/zego/generate-token',
    params
  );
};

/**
 * 获取 ZEGO 配置
 */
export const getZegoConfig = async () => {
  return await apiService.get<ZegoConfigData>('/api/zego/config');
};

