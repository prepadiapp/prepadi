import mammoth from 'mammoth';

import { normalizeRichTextInput, richTextToPlainText, sanitizeRichHtml } from '@/lib/rich-text';

export type ExtractedDocumentContent = {
  html: string;
  text: string;
  fileType: 'docx' | 'pdf';
};

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

async function extractPdfText(buffer: Buffer) {
  const moduleName = 'pdf-parse';
  const pdfParseModule = await import(/* webpackIgnore: true */ moduleName);
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const result = await pdfParse(buffer);
  return String(result?.text || '');
}

export async function extractDocumentContent(file: File): Promise<ExtractedDocumentContent> {
  const extension = getFileExtension(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (extension === 'docx') {
    const result = await mammoth.convertToHtml({ buffer });
    const html = sanitizeRichHtml(result.value || '');
    return {
      html,
      text: richTextToPlainText(html),
      fileType: 'docx',
    };
  }

  if (extension === 'pdf') {
    const text = await extractPdfText(buffer);
    return {
      html: normalizeRichTextInput(text),
      text,
      fileType: 'pdf',
    };
  }

  throw new Error('Unsupported file type. Please upload a .docx or text-based .pdf file.');
}
