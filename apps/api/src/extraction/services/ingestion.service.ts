import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js'); // Removed CJS require

@Injectable()
export class IngestionService {
  constructor(private prisma: PrismaService) { }

  async createSource(type: 'FILE' | 'TEXT' | 'URL', content: Buffer | string, metadata?: any) {
    let extractedContent = '';

    if (type === 'FILE' && Buffer.isBuffer(content)) {
      if (metadata?.mimetype === 'application/pdf') {
        try {
          // Dynamic import for ESM-only pdfjs-dist
          const pdfjsLib = await import('pdfjs-dist');

          // CMap configuration for Korean support
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(content),
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/cmaps/', // Match version
            cMapPacked: true,
            disableFontFace: true // Optimization
          });

          const pdfDocument = await loadingTask.promise;
          const maxPages = pdfDocument.numPages;
          const pageTexts = [];

          for (let i = 1; i <= maxPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageString = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            pageTexts.push(pageString);
          }
          extractedContent = pageTexts.join('\n\n');
        } catch (e) {
          console.error('PDF Parse Error:', e);
          extractedContent = 'PDF Parsing Failed: ' + (e instanceof Error ? e.message : String(e));
        }
      } else {
        extractedContent = content.toString('utf-8');
      }
    } else {
      extractedContent = content as string;
    }

    const source = await this.prisma.extractionSource.create({
      data: {
        type,
        content: extractedContent,
        metadata: metadata || {},
      }
    });

    return source;
  }
}
