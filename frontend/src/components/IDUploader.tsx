import React, { useState, ChangeEvent } from 'react';
// @ts-ignore
import { Card, Button } from '@/components/ui';
// @ts-ignore
import { UploadCloud, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

type IdCardSide = 'front' | 'back';

export default function IDUploader() {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState({
    front: '未上传',
    back: '未上传'
  });
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileUpload = (side: IdCardSide) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setErrorMessage('请选择图片文件');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('文件大小不能超过5MB');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    // 创建预览URL
    const previewUrl = URL.createObjectURL(file);
    
    // 更新状态
    if (side === 'front') {
      setFrontFile(file);
      setFrontPreview(previewUrl);
      setUploadStatus(prev => ({ ...prev, front: '已上传' }));
    } else {
      setBackFile(file);
      setBackPreview(previewUrl);
      setUploadStatus(prev => ({ ...prev, back: '已上传' }));
    }
    
    // 清除错误信息
    setErrorMessage('');
  };

  const removeFile = (side: IdCardSide) => () => {
    if (side === 'front') {
      if (frontPreview) {
        URL.revokeObjectURL(frontPreview);
      }
      setFrontFile(null);
      setFrontPreview(null);
      setUploadStatus(prev => ({ ...prev, front: '未上传' }));
    } else {
      if (backPreview) {
        URL.revokeObjectURL(backPreview);
      }
      setBackFile(null);
      setBackPreview(null);
      setUploadStatus(prev => ({ ...prev, back: '未上传' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">身份验证</h1>
          <p className="mt-2 text-gray-600">请上传您的身份证正反面照片</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 上传区域 */}
        <Card className="p-6 mb-6 shadow-lg rounded-xl">
          <div className="space-y-6">
            {/* 正面上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                身份证正面
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                  frontPreview ? 'border-green-200 bg-green-50' : 'border-gray-300 hover:border-primary'
                }`}
              >
                {frontPreview ? (
                  <div className="space-y-4">
                    <div className="relative h-48 rounded-md overflow-hidden bg-white">
                      <img
                        src={frontPreview}
                        alt="身份证正面预览"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm truncate">{frontFile?.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-600">{uploadStatus.front}</span>
                        <button
                          type="button"
                          onClick={removeFile('front')}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-3">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">上传身份证正面</p>
                    <p className="text-xs text-gray-500 mb-3">JPG/PNG格式，最大5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload('front')}
                      className="hidden"
                      id="front-upload"
                    />
                    <label
                      htmlFor="front-upload"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark cursor-pointer"
                    >
                      选择文件
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 反面上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                身份证反面
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                  backPreview ? 'border-green-200 bg-green-50' : 'border-gray-300 hover:border-primary'
                }`}
              >
                {backPreview ? (
                  <div className="space-y-4">
                    <div className="relative h-48 rounded-md overflow-hidden bg-white">
                      <img
                        src={backPreview}
                        alt="身份证反面预览"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm truncate">{backFile?.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-600">{uploadStatus.back}</span>
                        <button
                          type="button"
                          onClick={removeFile('back')}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-3">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">上传身份证反面（可选）</p>
                    <p className="text-xs text-gray-500 mb-3">JPG/PNG格式，最大5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload('back')}
                      className="hidden"
                      id="back-upload"
                    />
                    <label
                      htmlFor="back-upload"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark cursor-pointer"
                    >
                      选择文件
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 提交按钮 */}
        <div className="mt-8">
          <Button
            className="w-full py-3 text-base font-medium rounded-lg transition-colors bg-primary hover:bg-primary-dark text-white"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            确认提交
          </Button>
        </div>

        {/* 指南说明 */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2">上传指南</h3>
          <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
            <li>确保证件完整可见，无遮挡</li>
            <li>背景尽量单一，避免复杂图案</li>
            <li>图片需清晰可辨，无模糊或反光</li>
            <li>建议使用白色背景拍摄</li>
          </ul>
        </div>
      </div>
    </div>
  );
}