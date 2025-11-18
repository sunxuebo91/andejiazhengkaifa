import { apiService } from './api';
import { InterviewRoom, RoomListResponse, RoomStatusResponse } from '../types/interview.types';

export interface CreateRoomParams {
  roomId: string;
  roomName: string;
  hostName: string;
  hostZegoUserId: string;
}

export interface QueryRoomsParams {
  status?: 'active' | 'ended';
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * 创建面试间
 */
export const createRoom = async (params: CreateRoomParams) => {
  return await apiService.post<InterviewRoom>('/api/interview/rooms', params);
};

/**
 * 获取面试间列表
 */
export const getRooms = async (params?: QueryRoomsParams) => {
  return await apiService.get<RoomListResponse>('/api/interview/rooms', { params });
};

/**
 * 获取面试间详情
 */
export const getRoomDetail = async (roomId: string) => {
  return await apiService.get<InterviewRoom>(`/api/interview/rooms/${roomId}`);
};

/**
 * 结束面试间
 */
export const endRoom = async (roomId: string) => {
  return await apiService.post<InterviewRoom>(`/api/interview/rooms/${roomId}/end`);
};

/**
 * 检查面试间状态
 */
export const checkRoomStatus = async (roomId: string) => {
  return await apiService.get<RoomStatusResponse>(`/api/interview/rooms/${roomId}/status`);
};

export const interviewService = {
  createRoom,
  getRooms,
  getRoomDetail,
  endRoom,
  checkRoomStatus,
};

