import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Tag, Popconfirm, Input, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import roleService, { PermissionCatalogGroup } from '../../services/role.service';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  usersCount: number;
}

type PermissionInfo = { text: string; color: string };

const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [permissionMap, setPermissionMap] = useState<Record<string, PermissionInfo>>({});
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 根据后端权限目录生成 code → {text,color} 映射
  const fetchPermissionCatalog = async () => {
    try {
      const response = await roleService.getPermissionCatalog();
      if (response.success && Array.isArray(response.data)) {
        const map: Record<string, PermissionInfo> = {};
        (response.data as PermissionCatalogGroup[]).forEach((group) => {
          group.permissions.forEach((perm) => {
            map[perm.key] = { text: perm.label, color: perm.color };
          });
        });
        setPermissionMap(map);
      }
    } catch (error: any) {
      console.error('获取权限目录失败:', error);
    }
  };

  const getPermissionInfo = (permission: string): PermissionInfo => {
    return permissionMap[permission] || { text: permission, color: 'default' };
  };

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleService.getList({ page: 1, pageSize: 100 });
      if (response.success && response.data) {
        // 将后端返回的数据转换为前端需要的格式
        const formattedRoles = response.data.items.map((role: any) => ({
          id: role._id,
          name: role.name,
          description: role.description,
          permissions: role.permissions || [],
          createdAt: new Date(role.createdAt).toLocaleString('zh-CN'),
          usersCount: role.usersCount || 0
        }));
        setRoles(formattedRoles);
      } else {
        message.error('获取角色列表失败');
      }
    } catch (error: any) {
      console.error('获取角色列表失败:', error);
      message.error('获取角色列表失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 删除角色
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const response = await roleService.remove(id);
      if (response.success) {
        message.success('角色删除成功');
        // 重新获取角色列表
        await fetchRoles();
      } else {
        message.error('角色删除失败：' + (response.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('删除角色失败:', error);
      message.error('删除角色失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 搜索角色
  const handleSearch = (value: string) => {
    setKeyword(value);
  };

  // 过滤角色
  const filteredRoles = roles.filter(role => 
    role.name.includes(keyword) || 
    role.description.includes(keyword)
  );

  useEffect(() => {
    fetchPermissionCatalog();
    fetchRoles();
  }, []);

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Space size={[0, 4]} wrap>
          {permissions.map(perm => {
            const permInfo = getPermissionInfo(perm);
            return (
              <Tag color={permInfo.color} key={perm}>
                {permInfo.text}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '关联用户数',
      dataIndex: 'usersCount',
      key: 'usersCount',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Role) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/roles/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此角色吗？"
            description="关联的用户将失去此角色权限。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small"
              icon={<DeleteOutlined />}
              disabled={record.id === '1'} // 防止删除系统管理员角色
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '角色管理',
      }}
    >
      <Card variant="outlined">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="搜索角色名称/描述"
            onSearch={handleSearch}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 300 }}
            allowClear
            enterButton={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/roles/edit/new')}
          >
            新建角色
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={filteredRoles}
          rowKey="id"
          loading={loading}
          pagination={{ 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>
    </PageContainer>
  );
};

export default RoleList; 
