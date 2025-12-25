import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
const pdf = require('pdf-parse');

@Injectable()
export class IngestionService {
  constructor(private prisma: PrismaService) { }

  async createSource(type: 'FILE' | 'TEXT' | 'URL' | 'API', content: string | Buffer, metadata?: { projectId?: string, perspective?: string, [key: string]: any }) {
    let extractedContent = '';

    if (type === 'FILE' && Buffer.isBuffer(content)) {
      if (metadata?.mimetype === 'application/pdf') {
        try {
            const data = await pdf(content);
            extractedContent = data.text;
        } catch (e) {
            console.error('PDF Parse Error:', e);
            extractedContent = 'PDF Parsing Failed: ' + (e instanceof Error ? e.message : String(e));
        }
      } else {
        extractedContent = content.toString('utf-8');
      }
    } else if (typeof content === 'string') {
      extractedContent = content;
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
