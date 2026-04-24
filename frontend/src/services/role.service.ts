import { apiService } from './api';

/**
 * 角色数据类型
 */
export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建角色DTO
 */
export interface CreateRoleDto {
  name: string;
  description: string;
  permissions: string[];
  active?: boolean;
}

/**
 * 更新角色DTO
 */
export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
  active?: boolean;
}

/**
 * 角色列表响应
 */
export interface RoleListResponse {
  items: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 权限目录单项（与后端 PERMISSION_CATALOG 对齐）
 */
export interface PermissionCatalogItem {
  key: string;
  label: string;
  description: string;
  color: string;
}

/**
 * 权限目录分组
 */
export interface PermissionCatalogGroup {
  title: string;
  permissions: PermissionCatalogItem[];
}

/**
 * 角色服务
 */
const roleService = {
  /**
   * 获取角色列表
   */
  async getList(params?: { page?: number; pageSize?: number; search?: string }) {
    return apiService.get<RoleListResponse>('/api/roles', params);
  },

  /**
   * 获取单个角色详情
   */
  async getOne(id: string) {
    return apiService.get<Role>(`/api/roles/${id}`);
  },

  /**
   * 创建角色
   */
  async create(data: CreateRoleDto) {
    return apiService.post<Role>('/api/roles', data);
  },

  /**
   * 更新角色
   */
  async update(id: string, data: UpdateRoleDto) {
    return apiService.patch<Role>(`/api/roles/${id}`, data);
  },

  /**
   * 删除角色
   */
  async remove(id: string) {
    return apiService.delete(`/api/roles/${id}`);
  },

  /**
   * 获取权限目录（由后端统一提供，角色管理 UI 的唯一事实来源）
   */
  async getPermissionCatalog() {
    return apiService.get<PermissionCatalogGroup[]>('/api/permissions/catalog');
  },
};

export default roleService;

