import DOMPurify from 'isomorphic-dompurify';

export const ALLOWED_RICH_TEXT_TAGS = [
  'b',
  'strong',
  'i',
  'em',
  'u',
  'sub',
  'sup',
  'br',
  'p',
  'div',
  'ol',
  'ul',
  'li',
];

export function hasHtmlMarkup(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preserveCommonInlineStyles(value: string) {
  let result = value;
  const styledSpanPattern = /<span([^>]*)style=["']([^"']*)["']([^>]*)>([\s\S]*?)<\/span>/gi;

  for (let i = 0; i < 5; i += 1) {
    const next = result.replace(styledSpanPattern, (_match, _before, style, _after, content) => {
      const normalizedStyle = String(style || '').toLowerCase();
      let wrapped = content;

      if (/text-decoration[^;]*underline/.test(normalizedStyle)) {
        wrapped = `<u>${wrapped}</u>`;
      }
      if (/font-style[^;]*italic/.test(normalizedStyle)) {
        wrapped = `<em>${wrapped}</em>`;
      }
      if (/font-weight[^;]*(bold|[6-9]00)/.test(normalizedStyle)) {
        wrapped = `<strong>${wrapped}</strong>`;
      }

      return wrapped;
    });

    if (next === result) break;
    result = next;
  }

  return result;
}

export function sanitizeRichHtml(value: string) {
  return DOMPurify.sanitize(preserveCommonInlineStyles(value || ''), {
    ALLOWED_TAGS: ALLOWED_RICH_TEXT_TAGS,
    ALLOWED_ATTR: [],
  }).trim();
}

export function plainTextToHtml(value: string) {
  return escapeHtml(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}

export function normalizeRichTextInput(value: string) {
  if (!value) return '';
  return hasHtmlMarkup(value) ? sanitizeRichHtml(value) : plainTextToHtml(value);
}

export function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function richTextToPlainText(value: string) {
  return decodeBasicEntities(
    sanitizeRichHtml(value || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|ol|ul)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
