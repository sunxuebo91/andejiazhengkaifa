import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Row,
  Col,
  Divider,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { contractService } from '../../services/contractService';
import { Contract, ContractType } from '../../types/contract.types';
import EditContractModal from '../../components/EditContractModal';
import dayjs from 'dayjs';

const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    fetchContractDetail();
  }, [id]);

  const fetchContractDetail = async () => {
    if (!id) {
      message.error('无效的合同ID');
      navigate('/contracts');
      return;
    }

    try {
      setLoading(true);
      const response = await contractService.getContractById(id);
      setContract(response);
    } catch (error) {
      console.error('获取合同详情失败:', error);
      message.error('获取合同详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/contracts');
  };

  const handleEdit = () => {
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    fetchContractDetail(); // 重新获取合同详情
  };

  const getContractTypeColor = (type: ContractType) => {
    const colors: Record<ContractType, string> = {
      [ContractType.HOURLY_WORKER]: 'blue',
      [ContractType.NANNY_CHILDCARE]: 'green',
      [ContractType.MATERNITY_NURSE]: 'purple',
    };
    return colors[type] || 'default';
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('YYYY年MM月DD日');
  };

  const formatDateTime = (dateString: string) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss');
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '24px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>合同不存在</h3>
            <Button type="primary" onClick={handleBack}>
              返回合同列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              返回
            </Button>
            <span>合同详情 - {contract.contractNumber}</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              打印合同
            </Button>
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑合同
            </Button>
          </Space>
        }
      >
        <Row gutter={24}>
          {/* 合同基本信息 */}
          <Col span={24}>
            <Card type="inner" title="合同基本信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="合同编号" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {contract.contractNumber}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="合同类型" span={1}>
                  <Tag color={getContractTypeColor(contract.contractType)}>
                    {contract.contractType}
                  </Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="合同状态" span={1}>
                  <Tag color="green">进行中</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="服务开始日期" span={1}>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatDate(contract.startDate)}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="服务结束日期" span={1}>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatDate(contract.endDate)}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="服务期限" span={1}>
                  <span style={{ color: '#52c41a' }}>
                    {dayjs(contract.endDate).diff(dayjs(contract.startDate), 'day') + 1} 天
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 客户信息 */}
          <Col span={12}>
            <Card type="inner" title="客户信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="客户姓名">
                  <span style={{ fontWeight: 'bold' }}>{contract.customerName}</span>
                </Descriptions.Item>
                
                <Descriptions.Item label="联系电话">
                  {contract.customerPhone}
                </Descriptions.Item>
                
                <Descriptions.Item label="身份证号">
                  {contract.customerIdCard ? 
                    `${contract.customerIdCard.slice(0, 6)}****${contract.customerIdCard.slice(-4)}` : 
                    '未提供'
                  }
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 服务人员信息 */}
          <Col span={12}>
            <Card type="inner" title="服务人员信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="服务人员姓名">
                  <span style={{ fontWeight: 'bold' }}>{contract.workerName}</span>
                </Descriptions.Item>
                
                <Descriptions.Item label="联系电话">
                  {contract.workerPhone}
                </Descriptions.Item>
                
                <Descriptions.Item label="身份证号">
                  {contract.workerIdCard ? 
                    `${contract.workerIdCard.slice(0, 6)}****${contract.workerIdCard.slice(-4)}` : 
                    '未提供'
                  }
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 费用信息 */}
          <Col span={24}>
            <Card type="inner" title="费用信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="家政员工资" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
                    ¥{contract.workerSalary?.toLocaleString()}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="客户服务费" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '16px' }}>
                    ¥{contract.customerServiceFee?.toLocaleString()}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="家政员服务费" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#722ed1', fontSize: '16px' }}>
                    {contract.workerServiceFee ? 
                      `¥${contract.workerServiceFee.toLocaleString()}` : 
                      '无'
                    }
                  </span>
                </Descriptions.Item>
                
                {contract.deposit && (
                  <Descriptions.Item label="约定定金" span={1}>
                    <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                      ¥{contract.deposit.toLocaleString()}
                    </span>
                  </Descriptions.Item>
                )}
                
                {contract.finalPayment && (
                  <Descriptions.Item label="约定尾款" span={1}>
                    <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                      ¥{contract.finalPayment.toLocaleString()}
                    </span>
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label="费用总计" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#f5222d', fontSize: '18px' }}>
                    ¥{(
                      contract.workerSalary + 
                      contract.customerServiceFee + 
                      (contract.workerServiceFee || 0)
                    ).toLocaleString()}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 其他信息 */}
          <Col span={24}>
            <Card type="inner" title="其他信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                {contract.expectedDeliveryDate && (
                  <Descriptions.Item label="预产期" span={1}>
                    <span style={{ color: '#eb2f96' }}>
                      {formatDate(contract.expectedDeliveryDate)}
                    </span>
                  </Descriptions.Item>
                )}
                
                {contract.salaryPaymentDay && (
                  <Descriptions.Item label="工资发放日" span={1}>
                    每月 {contract.salaryPaymentDay} 日
                  </Descriptions.Item>
                )}
                
                {contract.monthlyWorkDays && (
                  <Descriptions.Item label="月工作天数" span={1}>
                    {contract.monthlyWorkDays} 天
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* 备注信息 */}
          {contract.remarks && (
            <Col span={24}>
              <Card type="inner" title="备注信息" style={{ marginBottom: '16px' }}>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="备注">
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {contract.remarks}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          )}

          {/* 系统信息 */}
          <Col span={24}>
            <Card type="inner" title="系统信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="创建人" span={1}>
                  {typeof contract.createdBy === 'object' && contract.createdBy?.name 
                    ? contract.createdBy.name 
                    : (contract.createdByUser?.name || (typeof contract.createdBy === 'string' ? contract.createdBy : '未知'))
                  }
                </Descriptions.Item>
                
                <Descriptions.Item label="创建时间" span={1}>
                  {formatDateTime(contract.createdAt)}
                </Descriptions.Item>
                
                <Descriptions.Item label="最后更新时间" span={2}>
                  {formatDateTime(contract.updatedAt)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button size="large" onClick={handleBack}>
              返回合同列表
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑合同
            </Button>
            <Button 
              size="large" 
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              打印合同
            </Button>
          </Space>
        </div>
      </Card>

      {/* 编辑合同模态框 */}
      {contract && (
        <EditContractModal
          visible={editModalVisible}
          contract={contract}
          onCancel={() => setEditModalVisible(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default ContractDetail; 