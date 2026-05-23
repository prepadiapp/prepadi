import mammoth from 'mammoth';

import { richTextToPlainText, sanitizeRichHtml } from '@/lib/rich-text';

export type ExtractedDocumentContent = {
  html: string;
  text: string;
  fileType: 'docx';
};

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
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
    const html = sanitizeRichHtml(result.value || '');
    return {
      html,
      text: richTextToPlainText(html),
      fileType: 'docx',
    };
  }

  throw new Error('Unsupported file type. Please upload a .docx file.');
}
