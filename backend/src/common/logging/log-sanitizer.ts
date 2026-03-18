const SENSITIVE_KEY_PATTERN =
  /phone|mobile|idcard|identity|token|authorization|cookie|openid|privatekey|publickey|address|signurl|signature|secret|password/i;
const MOBILE_PATTERN = /1\d{10}/g;
const ID_CARD_PATTERN = /\b\d{17}[\dXx]\b/g;

function maskPhone(value: string): string {
  return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskIdCard(value: string): string {
  if (value.length < 8) return '***';
  return `${value.slice(0, 3)}***********${value.slice(-4)}`;
}

function maskGeneric(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function sanitizeStringValue(value: string, key?: string): string {
  if (SENSITIVE_KEY_PATTERN.test(key || '')) {
    if (/phone|mobile/i.test(key || '')) return maskPhone(value);
    if (/idcard|identity/i.test(key || '')) return maskIdCard(value);
    return maskGeneric(value);
  }

  return value
    .replace(MOBILE_PATTERN, (match) => maskPhone(match))
    .replace(ID_CARD_PATTERN, (match) => maskIdCard(match));
}

export function sanitizeLogData<T>(value: T, key?: string): T {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return sanitizeStringValue(value, key) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item, key)) as T;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeStringValue(value.message),
      stack: value.stack?.split('\n').slice(0, 6).join('\n'),
    } as T;
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[entryKey] = sanitizeLogData(entryValue, entryKey);
    }
    return sanitized as T;
  }

  return value;
}

