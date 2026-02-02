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

export interface FormatArticleInput {
  contentRaw: string;
  imageUrls?: string[];
}

/**
 * 判断一行文本是否可能是标题
 * 规则：
 * 1. 长度在2-30字之间
 * 2. 不以标点符号结尾（除了问号）
 * 3. 前后有空行（由调用者判断）
 */
function isPossibleHeading(text: string): boolean {
  const trimmed = text.trim();
  const len = trimmed.length;
  if (len < 2 || len > 30) return false;

  // 不以常见句末标点结尾（问号除外，因为标题可能是疑问句）
  const lastChar = trimmed[trimmed.length - 1];
  if (['。', '，', '、', '；', '：', '！', '.', ',', ';', ':'].includes(lastChar)) {
    return false;
  }

  return true;
}

/**
 * 轻量“智能排版”规则：
 * - 纯文本自动分段（空行分段）
 * - 自动识别标题（短行且独立）
 * - 保留段落缩进
 * - 支持 Markdown 标题（#~######）
 * - 支持无序列表（- / *）
 * - 支持图片语法：![](url) 或 ![alt](url)
 * - 未在正文中引用的图片，会自动追加到文末
 */
export function formatArticleToHtml(input: FormatArticleInput): string {
  const raw = (input.contentRaw ?? '').replace(/\r\n/g, '\n').trim();
  const imageUrls = Array.isArray(input.imageUrls) ? input.imageUrls.filter(Boolean) : [];

  const referencedImages = new Set(extractImageUrlsFromRaw(raw));

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
      if (text) {
        // 处理段落内的图片引用
        const processedText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
          if (isHttpUrl(url.trim())) {
            referencedImages.add(url.trim());
            const safeAlt = escapeHtml((alt || '').trim());
            return `<img class="article-img-inline" src="${escapeHtml(url.trim())}" alt="${safeAlt}" />`;
          }
          return match;
        });
        blocks.push(`<p>${escapeHtml(processedText).replace(/\n/g, '<br/>')}</p>`);
      }
      paraBuffer = [];
    }
  };

  const pushImage = (url: string, alt?: string) => {
    if (!url || !isHttpUrl(url)) return;
    referencedImages.add(url);
    const safeAlt = escapeHtml((alt || '').trim());
    blocks.push(
      `<figure class="article-figure"><img class="article-img" src="${escapeHtml(url)}" alt="${safeAlt}" /></figure>`,
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line0 = lines[i];
    const line = line0.trimEnd();
    const trimmedLine = line.trim();

    // 空行：分段
    if (trimmedLine === '') {
      flushList();
      flushPara();
      continue;
    }

    // 图片（独占一行时作为块）
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      flushList();
      flushPara();
      pushImage(imgMatch[2].trim(), imgMatch[1]);
      continue;
    }

    // Markdown 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushPara();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${escapeHtml(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    // 列表
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushPara();
      listBuffer.push(`<li>${escapeHtml(listMatch[1].trim())}</li>`);
      continue;
    }

    // 自动识别标题：短行且前后有空行
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    if (isPossibleHeading(trimmedLine) && prevLine === '' && nextLine === '') {
      flushList();
      flushPara();
      blocks.push(`<h3>${escapeHtml(trimmedLine)}</h3>`);
      continue;
    }

    // 普通文本行（放到段落里）
    flushList();
    paraBuffer.push(line);
  }

  flushList();
  flushPara();

  // 追加未引用图片
  const trailingImages = imageUrls.filter((u) => isHttpUrl(u) && !referencedImages.has(u));
  if (trailingImages.length > 0) {
    blocks.push('<hr/>');
    for (const url of trailingImages) {
      blocks.push(
        `<figure class="article-figure"><img class="article-img" src="${escapeHtml(url)}" alt="" /></figure>`,
      );
    }
  }

  // 统一容器 + 默认样式（最小可用，前端也可再覆盖）
  return `
<div class="article-content">
  ${blocks.join('\n  ')}
</div>
`.trim();
}

export function deriveTitleFromRaw(contentRaw: string, maxLen = 30): string {
  const raw = (contentRaw ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return '未命名文章';
  const firstLine = raw.split('\n').map((s) => s.trim()).find((s) => s) || raw;
  const normalized = firstLine.replace(/^#{1,6}\s+/, '').trim();
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized;
}
