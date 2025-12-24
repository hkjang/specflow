import { Injectable } from '@nestjs/common';

@Injectable()
export class PreprocessingService {
    cleanText(text: string): string {
        // Basic cleaning
        return text.replace(/\s+/g, ' ').trim();
    }
}
