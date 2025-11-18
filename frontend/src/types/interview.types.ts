export interface Participant {
  userId: string;
  userName: string;
  role: 'host' | 'guest';
  identity?: string;
  joinedAt: string;
  leftAt?: string;
}

export interface InterviewRoom {
  _id: string;
  roomId: string;
  roomName: string;
  hostUserId: string;
  hostName: string;
  hostZegoUserId: string;
  status: 'active' | 'ended';
  source?: 'pc' | 'miniprogram';
  hostUrl?: string; // 主持人重新进入的URL（带token）
  createdAt: string;
  endedAt?: string;
  duration?: number;
  participants: Participant[];
}

export interface RoomListResponse {
  list: InterviewRoom[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RoomStatusResponse {
  roomId: string;
  roomName: string;
  dbStatus: 'active' | 'ended';
  zegoExists: boolean;
  zegoCanJoin: boolean;
  isDismissed: boolean;
  createdAt: string;
  endedAt?: string;
  duration?: number;
}

