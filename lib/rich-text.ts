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

const ALLOWED_TAG_SET = new Set(ALLOWED_RICH_TEXT_TAGS);

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

function stripDangerousBlocks(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
    .replace(/<svg[\s\S]*?>[\s\S]*?<\/svg>/gi, '');
}

function unwrapUnsupportedTags(value: string) {
  return value.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const normalizedTag = String(tagName || '').toLowerCase();
    if (!ALLOWED_TAG_SET.has(normalizedTag)) {
      return '';
    }

    const isClosing = match.startsWith('</');
    if (isClosing) {
      return `</${normalizedTag}>`;
    }

    if (normalizedTag === 'br') {
      return '<br>';
    }

    return `<${normalizedTag}>`;
  });
}

function normalizeWhitespaceAroundTags(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeRichHtml(value: string) {
  if (!value) return '';

  const prepared = preserveCommonInlineStyles(value)
    .replace(/javascript:/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  const cleaned = unwrapUnsupportedTags(stripDangerousBlocks(prepared));
  return normalizeWhitespaceAroundTags(cleaned);
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
