import mammoth from 'mammoth';

export type ExtractedDocumentContent = {
  html: string;
  text: string;
  fileType: 'docx';
};

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function preserveCommonInlineStyles(value: string) {
  let result = value;
  const styledSpanPattern = /<span([^>]*)style=["']([^"']*)["']([^>]*)>([\s\S]*?)<\/span>/gi;

  for (let i = 0; i < 5; i += 1) {
    const next = result.replace(styledSpanPattern, (_match, _before, style, _after, content) => {
      const normalizedStyle = String(style || '').toLowerCase();
      let wrapped = content;

      if (/text-decoration[^;]*underline/.test(normalizedStyle)) wrapped = `<u>${wrapped}</u>`;
      if (/font-style[^;]*italic/.test(normalizedStyle)) wrapped = `<em>${wrapped}</em>`;
      if (/font-weight[^;]*(bold|[6-9]00)/.test(normalizedStyle)) wrapped = `<strong>${wrapped}</strong>`;

      return wrapped;
    });

    if (next === result) break;
    result = next;
  }

  return result;
}

function sanitizeDocxHtml(value: string) {
  return preserveCommonInlineStyles(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function richHtmlToPlainText(value: string) {
  return decodeBasicEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|ol|ul)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractDocumentContent(file: File): Promise<ExtractedDocumentContent> {
  const extension = getFileExtension(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (extension === 'docx') {
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        // Mammoth ignores underline unless it is explicitly mapped.
        styleMap: ['u => u'],
      }
    );
    const html = sanitizeDocxHtml(result.value || '');
    return {
      html,
      text: richHtmlToPlainText(html),
      fileType: 'docx',
    };
  }

  throw new Error('Unsupported file type. Please upload a .docx file.');
}
