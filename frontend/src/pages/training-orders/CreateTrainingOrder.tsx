import React from 'react';
import ESignaturePage from '../esign/ESignaturePage';

// 职培订单创建页面：复用 ESignaturePage 四步电子签约流程（学员模式）
const CreateTrainingOrder: React.FC = () => {
  return <ESignaturePage mode="student" />;
};

export default CreateTrainingOrder;
