export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId?: string;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: number;
} 
