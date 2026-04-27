import React, { useEffect, useRef, useState } from 'react';
import { Button, message } from 'antd';
import {
  confirmSubscribe,
  isInWechat,
  setupWechatJsSdk,
} from '../../services/wechat-subscribe';

export type SubscribeStatus = 'accept' | 'reject' | 'cancel' | 'filter' | 'unknown' | 'error';

interface Props {
  templateId: string;
  count?: number;
  buttonText: string;
  buttonStyle?: string;
  onAfterSubscribe?: (status: SubscribeStatus) => void;
  fallbackOnClick?: () => void;
  fallbackChildren?: React.ReactNode;
  type?: 'primary' | 'default' | 'dashed';
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
}

let wxConfigPromise: Promise<void> | null = null;
const ensureWxConfigOnce = (): Promise<void> => {
  if (wxConfigPromise) return wxConfigPromise;
  wxConfigPromise = setupWechatJsSdk(window.location.href.split('#')[0]).catch((e) => {
    wxConfigPromise = null;
    throw e;
  });
  return wxConfigPromise;
};

const DEFAULT_BTN_STYLE =
  'width:100%;height:48px;background:#07C160;color:#fff;border:0;border-radius:6px;font-size:16px;font-weight:500;cursor:pointer;';

const SubscribeButton: React.FC<Props> = ({
  templateId,
  count = 5,
  buttonText,
  buttonStyle,
  onAfterSubscribe,
  fallbackOnClick,
  fallbackChildren,
  type = 'primary',
  size = 'large',
  block = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const inWechat = isInWechat();

  useEffect(() => {
    if (!inWechat) return;
    let cancelled = false;
    ensureWxConfigOnce()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) message.error(`JS-SDK 初始化失败: ${err?.message || err}`);
      });
    return () => {
      cancelled = true;
    };
  }, [inWechat]);

  useEffect(() => {
    if (!inWechat || !ready || !templateId || !containerRef.current) return;
    const container = containerRef.current;
    const safeText = String(buttonText).replace(/[<>&"']/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string),
    );
    container.innerHTML = `
      <wx-open-subscribe template="${templateId}" style="display:block;width:100%;">
        <script type="text/wxtag-template">
          <button style="${buttonStyle || DEFAULT_BTN_STYLE}">${safeText}</button>
        </script>
      </wx-open-subscribe>
    `;
    const tag = container.querySelector('wx-open-subscribe');
    if (!tag) return;

    const onSuccess = (e: any) => {
      let status: SubscribeStatus = 'unknown';
      try {
        const raw = e.detail?.subscribeDetails || '{}';
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const itemRaw = parsed[templateId];
        const item = typeof itemRaw === 'string' ? JSON.parse(itemRaw) : itemRaw || {};
        status = (item.status as SubscribeStatus) || 'unknown';
      } catch {
        status = 'error';
      }

      if (status === 'accept') {
        confirmSubscribe('accept', templateId, count)
          .then((resp) => {
            if (resp.success) {
              message.success(`订阅成功，已增加 ${count} 条额度`);
            } else {
              message.error(resp.message || '订阅确认失败');
            }
          })
          .catch((err: any) => message.error(err?.message || '订阅确认失败'))
          .finally(() => onAfterSubscribe?.(status));
        return;
      }

      if (status === 'reject') message.info('您已拒绝订阅');
      else if (status === 'cancel') message.info('您已取消订阅');
      else if (status === 'filter') message.warning('该模板已被后台过滤');
      onAfterSubscribe?.(status);
    };

    const onError = (e: any) => {
      const errMsg = e.detail?.errMsg || JSON.stringify(e.detail || {});
      message.error(`订阅按钮报错: ${errMsg}`);
      onAfterSubscribe?.('error');
    };

    tag.addEventListener('success', onSuccess);
    tag.addEventListener('error', onError);
    return () => {
      tag.removeEventListener('success', onSuccess);
      tag.removeEventListener('error', onError);
    };
  }, [inWechat, ready, templateId, count, buttonText, buttonStyle, onAfterSubscribe]);

  if (!inWechat) {
    return (
      <Button type={type} size={size} block={block} onClick={fallbackOnClick}>
        {fallbackChildren ?? buttonText}
      </Button>
    );
  }

  if (!ready) {
    return (
      <Button type={type} size={size} block={block} loading disabled>
        {buttonText}
      </Button>
    );
  }

  return <div ref={containerRef} />;
};

export default SubscribeButton;
