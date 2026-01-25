import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Select,
  Space,
  Switch,
  Tabs,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload';
import { PlusOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate, useParams } from 'react-router-dom';
import articleService, { Article } from '../../services/article.service';
import apiService from '../../services/api';
import { ImageService } from '../../services/imageService';
import RichTextEditor from '../../components/RichTextEditor';
import './ArticleList.css';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

const LOCAL_IMAGE_PREFIX = '__local_image__:';

const ARTICLE_PREVIEW_STYLE = `
  .article-content h1,.article-content h2,.article-content h3{margin:24px 0 16px;font-weight:600;color:#2c2c2c;line-height:1.4;}
  .article-content h1{font-size:26px;}
  .article-content h2{font-size:22px;}
  .article-content h3{font-size:19px;}
  .article-content p{margin:16px 0;white-space:pre-wrap;text-indent:0;line-height:1.75;letter-spacing:0.5px;}
  .article-content ul,.article-content ol{padding-left:28px;margin:16px 0;line-height:1.75;}
  .article-content li{margin:8px 0;}
  .article-content hr{border:none;border-top:1px solid #e5e5e5;margin:24px 0;}
  .article-content strong{font-weight:600;color:#2c2c2c;}
  .article-content em{font-style:italic;color:#666;}
  .article-content u{text-decoration:underline;}
  .article-content s{text-decoration:line-through;color:#999;}
  .article-figure{margin:20px 0;text-align:center;}
  .article-img{max-width:100%;display:block;margin:0 auto;}
  .article-img-inline{max-width:100%;vertical-align:middle;margin:0 4px;}
`;

type LocalImageTokenToSrc = Record<string, string>;

function isSafeDataImageUrl(url: string): boolean {
  return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url);
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [meta, b64Raw] = dataUrl.split(',');
  const mime = meta?.match(/^data:([^;]+);base64$/i)?.[1] || 'image/png';
  const b64 = (b64Raw || '').replace(/\s+/g, '');
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

function _extractDataImageUrls(text: string, max = 3): string[] {
  const out: string[] = [];
  if (!text) return out;
  const re = /data:image\/(png|jpe?g|gif|webp);base64,[a-zA-Z0-9+/=\s]+/gi;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(text)) !== null) {
    const full = m[0];
    if (full && isSafeDataImageUrl(full)) out.push(full);
    if (out.length >= max) break;
  }
  return out;
}

function extractImageUrlsFromRaw(raw: string): string[] {
  const urls: string[] = [];
  const re = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(raw)) !== null) {
    const url = (match[1] || '').trim();
    if (url && isHttpUrl(url)) urls.push(url);
  }
  return urls;
}

function normalizeRaw(raw: string): string {
  const lines = (raw || '').replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/g, ''));
  const out: string[] = [];
  let blankCount = 0;
  for (const l of lines) {
    if (l.trim() === '') {
      blankCount += 1;
      if (blankCount <= 2) out.push('');
      continue;
    }
    blankCount = 0;
    out.push(l);
  }
  return out.join('\n').trim();
}

function formatArticleToHtml(contentRaw: string, imageUrls: string[], localImageTokenToSrc: LocalImageTokenToSrc): string {
  const raw = normalizeRaw(contentRaw);
  const referenced = new Set(extractImageUrlsFromRaw(raw));

  const lines = raw.split('\n');
  const blocks: string[] = [];

  let listBuffer: string[] = [];
  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push(`<ul>${listBuffer.join('')}</ul>`);
      listBuffer = [];
    }
  };

  let paraBuffer: string[] = [];
  const flushPara = () => {
    if (paraBuffer.length > 0) {
      const text = paraBuffer.join('\n').trim();
      if (text) blocks.push(`<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`);
      paraBuffer = [];
    }
  };

  const resolvePreviewSrc = (url: string): string | null => {
    if (!url) return null;
    if (isHttpUrl(url)) return url;
    if (localImageTokenToSrc?.[url]) {
      return localImageTokenToSrc[url];
    }
    if (isSafeDataImageUrl(url)) return url;
    return null;
  };

  const pushImage = (url: string, alt?: string) => {
    const src = resolvePreviewSrc(url);
    if (!src) return;
    if (isHttpUrl(url)) referenced.add(url);
    const safeAlt = escapeHtml((alt || '').trim());
    blocks.push(
      `<figure class="article-figure"><img class="article-img" src="${escapeHtml(src)}" alt="${safeAlt}" /></figure>`,
    );
  };

  for (const line0 of lines) {
    const line = line0.trimEnd();

    if (line.trim() === '') {
      flushList();
      flushPara();
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      flushList();
      flushPara();
      pushImage(imgMatch[2].trim(), imgMatch[1]);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushPara();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${escapeHtml(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushPara();
      listBuffer.push(`<li>${escapeHtml(listMatch[1].trim())}</li>`);
      continue;
    }

    flushList();
    paraBuffer.push(line);
  }

  flushList();
  flushPara();

  const trailing = (imageUrls || []).filter((u) => isHttpUrl(u) && !referenced.has(u));
  if (trailing.length > 0) {
    blocks.push('<hr/>');
    for (const url of trailing) {
      blocks.push(
        `<figure class="article-figure"><img class="article-img" src="${escapeHtml(url)}" alt="" /></figure>`,
      );
    }
  }

  return `\n<div class="article-content">\n  ${blocks.join('\n  ')}\n</div>\n`.trim();
}

interface ArticleFormProps {
  id?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ id: propId, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [localImages, setLocalImages] = useState<Record<string, { file: File; objectUrl: string }>>({});

  const [form] = Form.useForm();
  const textAreaRef = useRef<any>(null);

  const imageUrls = useMemo(() => {
    return fileList
      .map((f) => (typeof f.url === 'string' ? f.url : undefined))
      .filter((u): u is string => Boolean(u));
  }, [fileList]);

  const localImageTokenToSrc: LocalImageTokenToSrc = useMemo(() => {
    const map: LocalImageTokenToSrc = {};
    Object.entries(localImages).forEach(([id, v]) => {
      map[`${LOCAL_IMAGE_PREFIX}${id}`] = v.objectUrl;
    });
    return map;
  }, [localImages]);

  const watchedRaw = Form.useWatch('contentRaw', form) || '';

  const previewHtml = useMemo(() => {
    if (watchedRaw.includes('<p>') || watchedRaw.includes('<h1>') || watchedRaw.includes('<strong>')) {
      return watchedRaw;
    }
    return formatArticleToHtml(watchedRaw, imageUrls, localImageTokenToSrc);
  }, [watchedRaw, imageUrls, localImageTokenToSrc]);

  // 加载文章数据（编辑模式）
  useEffect(() => {
    if (!isEdit) {
      form.setFieldsValue({ status: 'draft', contentRaw: '' });
      return;
    }

    const loadArticle = async () => {
      setLoading(true);
      try {
        const detail = await articleService.getOne(id!);
        const data: Article = detail.data;
        form.setFieldsValue({
          title: data.title,
          author: data.author,
          status: data.status || 'draft',
          contentRaw: data.contentRaw || '',
        });
        const urls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
        setFileList(
          urls.map((url, idx) => ({
            uid: `existing-${idx}`,
            name: `image-${idx + 1}.jpg`,
            status: 'done',
            url,
          })),
        );
      } catch (error: any) {
        message.error(error.message || '加载详情失败');
        navigate('/baobei/articles');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id, isEdit, form, navigate]);

  const cleanupLocalImages = () => {
    Object.values(localImages).forEach((v) => {
      try {
        URL.revokeObjectURL(v.objectUrl);
      } catch {
        // ignore
      }
    });
    setLocalImages({});
  };

  const insertAtCursor = (text: string) => {
    let el: HTMLTextAreaElement | null = null;

    if (textAreaRef.current?.resizableTextArea?.textArea) {
      el = textAreaRef.current.resizableTextArea.textArea;
    } else if (textAreaRef.current instanceof HTMLTextAreaElement) {
      el = textAreaRef.current;
    } else if (textAreaRef.current) {
      const textarea = (textAreaRef.current as any).querySelector?.('textarea');
      if (textarea instanceof HTMLTextAreaElement) {
        el = textarea;
      }
    }

    const current = form.getFieldValue('contentRaw') || '';

    if (!el) {
      form.setFieldsValue({ contentRaw: `${current}${current ? '\n' : ''}${text}` });
      message.info('图片已插入到文本末尾');
      return;
    }

    el.focus();
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    form.setFieldsValue({ contentRaw: next });

    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        const pos = start + text.length;
        el.selectionStart = pos;
        el.selectionEnd = pos;

        const lineHeight = parseInt(window.getComputedStyle(el).lineHeight) || 20;
        const lines = el.value.substring(0, pos).split('\n').length;
        const cursorTop = lines * lineHeight;
        const viewportHeight = el.clientHeight;

        if (cursorTop < el.scrollTop || cursorTop > el.scrollTop + viewportHeight) {
          el.scrollTop = Math.max(0, cursorTop - viewportHeight / 2);
        }
      }
    });
  };

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'article');

      const result = await apiService.upload<{ fileUrl: string }>('/api/upload/file', formData);
      if (result.success && result.data?.fileUrl) {
        const url = result.data.fileUrl;
        const next: UploadFile = {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url,
        };
        setFileList((prev) => [...prev.filter((f) => f.uid !== file.uid), next]);
        message.success('上传成功');
        onSuccess(result, file);
      } else {
        message.error(result.message || '上传失败');
        onError(new Error(result.message || '上传失败'));
      }
    } catch (error: any) {
      message.error(error.message || '上传失败');
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const values = await form.validateFields();
      let contentRaw = normalizeRaw(values.contentRaw || '');

      // 上传本地占位图片
      const localTokenRe = /!\[[^\]]*\]\((__local_image__:[^)]+)\)/g;
      const localTokens: string[] = [];
      let m: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((m = localTokenRe.exec(contentRaw)) !== null) {
        const token = (m[1] || '').trim();
        if (token) localTokens.push(token);
      }

      const uniqLocalTokens = Array.from(new Set(localTokens));
      if (uniqLocalTokens.length > 0) {
        message.loading({ content: '正在上传正文图片到 COS...', key: 'saveUpload', duration: 0 });
        const uploads = await Promise.all(
          uniqLocalTokens.map(async (token) => {
            const id = token.startsWith(LOCAL_IMAGE_PREFIX) ? token.slice(LOCAL_IMAGE_PREFIX.length) : '';
            const entry = id ? localImages[id] : undefined;
            if (!entry?.file) throw new Error('存在未找到的本地图片，请重新粘贴后再保存');
            const url = await ImageService.uploadImage(entry.file);
            return { token, url };
          }),
        );

        uploads.forEach(({ token, url }) => {
          contentRaw = contentRaw.split(token).join(url);
        });

        form.setFieldsValue({ contentRaw });
        message.destroy('saveUpload');
        cleanupLocalImages();
      }

      if (/data:image\//i.test(contentRaw)) {
        throw new Error('检测到正文里仍包含 data:image/base64，请重新粘贴图片（系统会在保存时上传到 COS）');
      }

      // 提取图片 URL（支持Markdown和HTML格式）
      const imageUrlsFromContent: string[] = [];

      // 提取Markdown格式的图片: ![](url)
      const markdownImageRe = /!\[[^\]]*\]\(([^)]+)\)/g;
      let match: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((match = markdownImageRe.exec(contentRaw)) !== null) {
        const url = (match[1] || '').trim();
        if (url && url.startsWith('http')) {
          imageUrlsFromContent.push(url);
        }
      }

      // 提取HTML格式的图片: <img src="url">
      const htmlImageRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      // eslint-disable-next-line no-cond-assign
      while ((match = htmlImageRe.exec(contentRaw)) !== null) {
        const url = (match[1] || '').trim();
        if (url && url.startsWith('http')) {
          imageUrlsFromContent.push(url);
        }
      }

      const allImageUrls = Array.from(new Set([...imageUrls, ...imageUrlsFromContent]));

      const submitData = {
        ...values,
        contentRaw,
        imageUrls: allImageUrls,
      };

      if (isEdit) {
        await articleService.update(id!, submitData);
        message.success('更新成功');
      } else {
        await articleService.create(submitData);
        message.success('创建成功');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/baobei/articles');
      }
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error.message || '操作失败');
    } finally {
      message.destroy('saveUpload');
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/baobei/articles');
    }
  };

  return (
    <PageContainer
      title={isEdit ? '编辑文章' : '新增文章'}
      loading={loading}
      onBack={onCancel ? undefined : () => navigate('/baobei/articles')}
      extra={[
        <Button
          key="format"
          onClick={() => {
            const next = normalizeRaw(form.getFieldValue('contentRaw') || '');
            form.setFieldsValue({ contentRaw: next });
            message.success('已智能排版（整理空行/去尾空格）');
          }}
        >
          智能排版
        </Button>,
        <Button key="preview" onClick={() => setActiveTab('preview')}>
          预览
        </Button>,
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={uploading} onClick={handleSubmit}>
          保存
        </Button>,
      ]}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <Card bodyStyle={{ padding: '16px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as any)}
            items={[
              {
                key: 'edit',
                label: '编辑',
                children: (
                  <Form form={form} layout="vertical">
                  {/* 顶部：基本信息 */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <Form.Item
                      name="title"
                      label="标题（可选）"
                      rules={[{ max: 20, message: '标题不能超过20个字符' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input placeholder="不填则自动取正文首行" maxLength={20} showCount />
                    </Form.Item>
                    <Form.Item name="author" label="作者" style={{ width: 200, marginBottom: 0 }}>
                      <Input placeholder="例如：新华社" />
                    </Form.Item>
                    <Form.Item name="status" label="状态" style={{ width: 100, marginBottom: 0 }}>
                      <Select
                        options={[
                          { value: 'draft', label: '草稿' },
                          { value: 'published', label: '发布' },
                        ]}
                      />
                    </Form.Item>
                  </div>

                  {/* 正文编辑器 */}
                  <Form.Item
                    label="正文"
                    name="contentRaw"
                    rules={[{ required: true, message: '请输入正文' }]}
                    required
                    style={{ marginBottom: 12 }}
                  >
                    <RichTextEditor
                      placeholder="使用工具栏进行文字加粗、调整字号等格式化操作。也可以直接 Ctrl+V 粘贴图片，保存时自动上传"
                      style={{
                        width: '100%',
                      }}
                    />
                  </Form.Item>

                  {/* 底部：图片上传 */}
                  <Form.Item label="图片素材库" extra="上传的图片可以点击「插入」按钮插入到正文中，也可以直接在正文中 Ctrl+V 粘贴图片">
                    <Upload
                      listType="picture-card"
                      fileList={fileList}
                      accept="image/*"
                      multiple
                      customRequest={handleUpload}
                      onRemove={(file) => {
                        setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
                        return true;
                      }}
                      onPreview={(file) => {
                        if (file.url) window.open(String(file.url), '_blank');
                      }}
                    >
                      {fileList.length >= 8 ? null : (
                        <div>
                          <PlusOutlined />
                          <div style={{ marginTop: 8 }}>上传图片</div>
                        </div>
                      )}
                    </Upload>
                    {imageUrls.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Space wrap>
                          {imageUrls.map((url) => (
                            <Space key={url} size={6}>
                              <Button
                                size="small"
                                onClick={() => {
                                  const el = textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;
                                  if (el) {
                                    el.focus();
                                  }
                                  insertAtCursor(`${form.getFieldValue('contentRaw') ? '\n' : ''}![](${url})\n`);
                                }}
                              >
                                插入
                              </Button>
                              <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={async () => {
                                  await navigator.clipboard.writeText(url);
                                  message.success('已复制图片链接');
                                }}
                              />
                            </Space>
                          ))}
                        </Space>
                      </div>
                    )}
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'preview',
              label: '预览（智能排版）',
              children: (
                <div
                  style={{
                    maxWidth: 677,
                    margin: '0 auto',
                    border: '1px solid #e5e5e5',
                    borderRadius: 4,
                    padding: '32px 24px',
                    minHeight: 500,
                    maxHeight: 700,
                    overflow: 'auto',
                    backgroundColor: '#fff',
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                    style={{
                      lineHeight: 1.75,
                      fontSize: 17,
                      color: '#3e3e3e',
                      letterSpacing: '0.5px',
                    }}
                  />
                  <style>{ARTICLE_PREVIEW_STYLE}</style>
                </div>
              ),
            },
          ]}
        />
        </Card>
      </div>
    </PageContainer>
  );
};

export default ArticleForm;

