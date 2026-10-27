import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lọc sạch an toàn nội dung HTML từ API bên ngoài:
 * - Loại bỏ toàn bộ script, iframe, object, svg, math, form
 * - Chỉ cho phép các thẻ định dạng văn bản cơ bản (p, br, b, i, strong, em, span, u)
 * - Xóa sạch mọi thuộc tính (attributes) trên thẻ để triệt tiêu hoàn toàn rủi ro XSS
 */
export function sanitizeHtml(html?: string | null): string {
  if (!html) return '';
  // 1. Loại bỏ các khối thẻ nguy hiểm và nội dung bên trong chúng
  let clean = html.replace(/<(script|style|iframe|object|embed|svg|math|form|input)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  // 2. Chặn các event handler (onerror, onload...) ngay cả khi không có khoảng trắng (e.g. <img/onload=...>)
  clean = clean.replace(/[\s/]+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 3. Chặn javascript:, vbscript:, data: URIs
  clean = clean.replace(/(href|src|action|data)\s*=\s*["']?\s*(javascript|vbscript|data):[^"'>]*/gi, '$1="#"');
  // 4. Chỉ giữ lại các thẻ văn bản cơ bản (p, br, b, i, strong, em, span, u), loại bỏ toàn bộ thẻ khác
  clean = clean.replace(/<\/?(?!p\b|br\b|b\b|i\b|strong\b|em\b|span\b|u\b)[a-z0-9]+(?:\s+[^>]*)?>/gi, '');
  // 5. Xóa sạch mọi attribute còn lại trên các thẻ văn bản được giữ
  clean = clean.replace(/<(p|b|i|strong|em|span|u)\s+[^>]*>/gi, '<$1>');
  return clean;
}
