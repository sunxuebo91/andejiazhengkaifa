import React, { useState, useEffect } from 'react';
import { Badge, Spin, message, Card, Space, Button, Modal, DatePicker, Select, Form, Input, Row, Col, Tooltip } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import apiService from '@/services/api';

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const { Option } = Select;

interface AvailabilityPeriod {
  date: string;
  status: 'unset' | 'available' | 'unavailable' | 'occupied' | 'leave';
  contractId?: string;
  remarks?: string;
}

interface Props {
  resumeId: string;
  editable?: boolean;
  onUpdate?: () => void;
}

const statusConfig = {
  unset: { color: '#d9d9d9', text: '未设置', badge: 'default' },
  available: { color: '#52c41a', text: '可接单', badge: 'success' },
  unavailable: { color: '#333333', text: '不可接单', badge: 'default' },
  occupied: { color: '#ff4d4f', text: '订单占用', badge: 'error' },
  leave: { color: '#faad14', text: '已请假', badge: 'warning' }
};

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const AvailabilityCalendar: React.FC<Props> = ({ resumeId, editable = false, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>([]);
  const [baseYear, setBaseYear] = useState(dayjs().year());
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载档期数据 - 加载整年12个月
  const loadAvailability = async (year: number) => {
    setLoading(true);
    try {
      const startDate = dayjs().year(year).startOf('year').format('YYYY-MM-DD');
      const endDate = dayjs().year(year).endOf('year').format('YYYY-MM-DD');

      const response = await apiService.get(
        `/api/resumes/${resumeId}/availability?startDate=${startDate}&endDate=${endDate}`
      );

      // apiService 已经解析了 response.data，所以直接用 response
      if (response?.success) {
        setPeriods(response.data?.availabilityCalendar || []);
      } else {
        // 没有档期数据或请求失败，显示空日历，不报错
        setPeriods([]);
        console.log('档期数据为空或加载失败:', response?.message);
      }
    } catch (error: any) {
      console.error('加载档期失败:', error);
      // 出错时也显示空日历，不阻塞页面
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability(baseYear);
  }, [resumeId, baseYear]);

  // 获取指定日期的档期状态
  const getDateStatus = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return periods.find(p => dayjs(p.date).format('YYYY-MM-DD') === dateStr);
  };

  // 生成月份的日历数据
  const generateMonthDays = (year: number, month: number) => {
    const firstDay = dayjs().year(year).month(month).startOf('month');
    const lastDay = dayjs().year(year).month(month).endOf('month');
    const startDayOfWeek = firstDay.day();
    const daysInMonth = lastDay.date();

    const weeks: (Dayjs | null)[][] = [];
    let currentWeek: (Dayjs | null)[] = [];

    // 填充第一周的空白
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = dayjs().year(year).month(month).date(day);
      currentWeek.push(date);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 填充最后一周的空白
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  // 渲染单个月份卡片
  const renderMonthCard = (month: number) => {
    const weeks = generateMonthDays(baseYear, month);
    const monthName = dayjs().month(month).format('M月');

    return (
      <Card
        key={month}
        size="small"
        title={<span style={{ fontWeight: 600 }}>{monthName}</span>}
        style={{ height: '100%' }}
        bodyStyle={{ padding: '8px' }}
      >
        {/* 星期头部 */}
        <div style={{ display: 'flex', marginBottom: '4px' }}>
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '11px',
                color: '#999',
                fontWeight: 500
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} style={{ display: 'flex' }}>
            {week.map((date, dayIdx) => {
              if (!date) {
                return <div key={dayIdx} style={{ flex: 1, height: '24px' }} />;
              }

              const period = getDateStatus(date);
              const isToday = date.isSame(dayjs(), 'day');
              const config = period ? statusConfig[period.status] : null;

              return (
                <Tooltip
                  key={dayIdx}
                  title={period ? `${config?.text}${period.remarks ? ': ' + period.remarks : ''}` : null}
                >
                  <div
                    style={{
                      flex: 1,
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        backgroundColor: config?.color || (isToday ? '#e6f7ff' : 'transparent'),
                        color: config ? '#fff' : (isToday ? '#1890ff' : '#333'),
                        border: isToday && !config ? '1px solid #1890ff' : 'none',
                        cursor: period?.remarks ? 'pointer' : 'default',
                      }}
                    >
                      {date.date()}
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </Card>
    );
  };

  // 打开更新档期弹窗
  const handleOpenModal = () => {
    form.resetFields();
    setModalVisible(true);
  };

  // 提交更新档期
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDate, endDate] = values.dateRange;

      setLoading(true);
      const response = await apiService.post(`/api/resumes/${resumeId}/availability`, {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        status: values.status,
        remarks: values.remarks
      });

      // apiService 已经解析了 response.data，所以直接用 response
      if (response.success) {
        message.success(response.message || '更新档期成功');
        setModalVisible(false);
        loadAvailability(baseYear);
        onUpdate?.();
      } else {
        message.error(response.message || '更新档期失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '更新档期失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Spin spinning={loading}>
        <div style={{ padding: '8px' }}>
          {/* 图例和操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <Space wrap>
              {Object.entries(statusConfig).map(([key, config]) => (
                <Badge key={key} color={config.color} text={config.text} />
              ))}
            </Space>
            <Space>
              <Button onClick={() => setBaseYear(baseYear - 1)}>上一年</Button>
              <span style={{ fontWeight: 600, fontSize: '16px', minWidth: '60px', textAlign: 'center' }}>
                {baseYear}年
              </span>
              <Button onClick={() => setBaseYear(baseYear + 1)}>下一年</Button>
              {editable && (
                <Button type="primary" ghost onClick={handleOpenModal}>
                  档期不准，去更新
                </Button>
              )}
            </Space>
          </div>

          {/* 12个月份卡片 - 4列3行 */}
          <Row gutter={[12, 12]}>
            {Array.from({ length: 12 }, (_, i) => (
              <Col key={i} xs={24} sm={12} md={8} lg={6}>
                {renderMonthCard(i)}
              </Col>
            ))}
          </Row>

          {/* 更新档期弹窗 */}
          <Modal
            title="更新档期"
            open={modalVisible}
            onOk={handleSubmit}
            onCancel={() => setModalVisible(false)}
            confirmLoading={loading}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                label="日期范围"
                name="dateRange"
                rules={[{ required: true, message: '请选择日期范围' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="档期状态"
                name="status"
                rules={[{ required: true, message: '请选择档期状态' }]}
              >
                <Select placeholder="请选择档期状态">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <Option key={key} value={key}>
                      <Badge color={config.color} text={config.text} />
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="备注" name="remarks">
                <Input.TextArea rows={3} placeholder="请输入备注信息" />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Spin>
    </Card>
  );
};

export default AvailabilityCalendar;

