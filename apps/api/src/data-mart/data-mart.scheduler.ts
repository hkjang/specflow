import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataMartService } from './data-mart.service';

@Injectable()
export class DataMartScheduler {
    private readonly logger = new Logger(DataMartScheduler.name);

    constructor(private readonly dataMartService: DataMartService) { }

    // Daily collection job 
    // In a real app, the list of URLs would come from DB configuration
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyCollection() {
        this.logger.log('Starting Daily Requirement Collection...');

        // Example Seed URLs (mocking DB config)
        const seedUrls = [
            'https://github.com/nestjs/nest/readme',
            // 'https://tools.ietf.org/html/rfc1234', // valid example
        ];

        for (const url of seedUrls) {
            try {
                this.logger.log(`Collecting from ${url}...`);
                await this.dataMartService.collectFromUrl(url);
            } catch (e) {
                this.logger.error(`Failed to collect from ${url}`, e);
            }
        }

        this.logger.log('Daily Collection Completed.');
    }
}
