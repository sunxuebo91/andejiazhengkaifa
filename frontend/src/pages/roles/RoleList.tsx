import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Tag, Popconfirm, Input, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import roleService from '../../services/role.service';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  usersCount: number;
}

// 权限映射表
const permissionMap: Record<string, { text: string; color: string }> = {
  // 系统管理
  'admin:all': { text: '系统管理(全部)', color: 'red' },
  'admin:roles': { text: '角色管理', color: 'purple' },
  'admin:settings': { text: '系统设置', color: 'red' },
  // 阿姨管理
  'resume:all': { text: '阿姨管理(全部)', color: 'orange' },
  'resume:view': { text: '查看阿姨简历', color: 'blue' },
  'resume:create': { text: '创建阿姨简历', color: 'green' },
  'resume:edit': { text: '编辑阿姨简历', color: 'cyan' },
  'resume:delete': { text: '删除阿姨简历', color: 'red' },
  'resume:assign': { text: '分配阿姨', color: 'gold' },
  // 客户管理
  'customer:all': { text: '客户管理(全部)', color: 'gold' },
  'customer:view': { text: '查看客户', color: 'blue' },
  'customer:create': { text: '创建客户', color: 'green' },
  'customer:edit': { text: '编辑客户', color: 'cyan' },
  'customer:delete': { text: '删除客户', color: 'red' },
  // 合同管理
  'contract:all': { text: '合同管理(全部)', color: 'magenta' },
  'contract:view': { text: '查看合同', color: 'blue' },
  'contract:create': { text: '创建合同', color: 'green' },
  'contract:edit': { text: '编辑合同', color: 'cyan' },
  'contract:delete': { text: '删除合同', color: 'red' },
  // 保险管理
  'insurance:all': { text: '保险管理(全部)', color: 'volcano' },
  'insurance:view': { text: '查看保险', color: 'blue' },
  'insurance:create': { text: '创建保险', color: 'green' },
  'insurance:edit': { text: '编辑保险', color: 'cyan' },
  'insurance:delete': { text: '删除保险', color: 'red' },
  // 背调管理
  'background-check:all': { text: '背调管理(全部)', color: 'geekblue' },
  'background-check:view': { text: '查看背调', color: 'blue' },
  'background-check:create': { text: '创建背调', color: 'green' },
  'background-check:edit': { text: '编辑背调', color: 'cyan' },
  // 培训线索管理
  'training-lead:all': { text: '培训线索(全部)', color: 'lime' },
  'training-lead:view': { text: '查看培训线索', color: 'blue' },
  'training-lead:create': { text: '创建培训线索', color: 'green' },
  'training-lead:edit': { text: '编辑培训线索', color: 'cyan' },
  'training-lead:delete': { text: '删除培训线索', color: 'red' },
  // 用户管理
  'user:all': { text: '用户管理(全部)', color: 'green' },
  'user:view': { text: '查看用户', color: 'blue' },
  'user:create': { text: '创建用户', color: 'green' },
  'user:edit': { text: '编辑用户', color: 'cyan' },
  'user:delete': { text: '删除用户', color: 'red' },
  // 褓贝后台
  'baobei:all': { text: '褓贝后台(全部)', color: 'pink' },
  'baobei:view': { text: '查看褓贝后台', color: 'blue' },
  'baobei:edit': { text: '编辑褓贝后台', color: 'cyan' },
};

// 获取权限的颜色和文本
const getPermissionInfo = (permission: string) => {
  return permissionMap[permission] || { text: permission, color: 'default' };
};

const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const navigate = useNavigate();
  const { message } = App.useApp();

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
