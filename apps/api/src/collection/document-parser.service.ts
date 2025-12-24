import { Injectable } from '@nestjs/common';
const pdf = require('pdf-parse');

@Injectable()
export class DocumentParserService {

    async parse(buffer: Buffer, mimeType: string = 'application/pdf'): Promise<{ text: string, info?: any }> {
        if (mimeType.includes('pdf')) {
            try {
                const data = await pdf(buffer);
                return {
                    text: data.text,
                    info: data.info
                };
            } catch (error) {
                throw new Error(`Failed to parse PDF: ${error.message}`);
            }
        }

        // Fallback or text handling
        if (mimeType.includes('text')) {
            return { text: buffer.toString('utf-8') };
        }

        throw new Error('Unsupported file type');
    }

    // Helper to split long legal text into provisions
    splitProvisions(fullText: string): string[] {
        // Heuristic: Split by "Article N" or "Section N"
        // Simple regex for Korean Law "제N조" or "Article N"
        // This is a naive implementation for the MVP
        const provisions = fullText.split(/(?=Article \d+|제\d+조)/g);
        return provisions.filter(p => p.trim().length > 0);
    }
}
