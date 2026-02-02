import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

// 工具栏配置
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }], // 标题
    [{ size: ['small', false, 'large', 'huge'] }], // 字号
    ['bold', 'italic', 'underline', 'strike'], // 加粗、斜体、下划线、删除线
    [{ color: [] }, { background: [] }], // 文字颜色、背景色
    [{ list: 'ordered' }, { list: 'bullet' }], // 有序列表、无序列表
    [{ align: [] }], // 对齐方式
    ['link', 'image'], // 链接、图片
    ['clean'], // 清除格式
  ],
};

// 支持的格式
const formats = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'align',
  'link',
  'image',
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入正文内容...',
  style,
}) => {
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    // 设置中文标签 - 使用延迟确保 DOM 已渲染
    const timer = setTimeout(() => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const toolbar = quill.getModule('toolbar') as any;

        if (toolbar && toolbar.container) {
          // 修改标题下拉框的选项文本
          const headerPicker = toolbar.container.querySelector('.ql-header');
          if (headerPicker) {
            const options = headerPicker.querySelectorAll('option');
            // 根据 value 属性设置文本
            options.forEach((option: HTMLOptionElement) => {
              const value = option.value;
              if (value === '') option.textContent = '正文';
              else if (value === '1') option.textContent = '标题 1';
              else if (value === '2') option.textContent = '标题 2';
              else if (value === '3') option.textContent = '标题 3';
            });
          }

          // 修改字号下拉框的选项文本
          const sizePicker = toolbar.container.querySelector('.ql-size');
          if (sizePicker) {
            const options = sizePicker.querySelectorAll('option');
            // 根据 value 属性设置文本
            options.forEach((option: HTMLOptionElement) => {
              const value = option.value;
              if (value === 'small') option.textContent = '小';
              else if (value === '') option.textContent = '正常';
              else if (value === 'large') option.textContent = '大';
              else if (value === 'huge') option.textContent = '超大';
            });
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ ...style, minHeight: '600px' }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{
          height: '550px',
          backgroundColor: '#fff',
        }}
      />
    </div>
  );
};

export default RichTextEditor;

