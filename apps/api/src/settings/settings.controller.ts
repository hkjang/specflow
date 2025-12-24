import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Prisma } from '@prisma/client';

@Controller('settings') // maps to /api/settings. Admin prefix might be handled by frontend or global prefix.
// Wait, the frontend uses /admin/settings. But backend API can be just /settings or /admin/settings.
// For consistency, let's stick to simple resource names. Frontend will call /settings (which is proxied to localhost:3001/settings)
// Actually, earlier I saw global prefix might not be set for 'admin'.
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Post()
    upsert(@Body() dto: Prisma.SystemSettingCreateInput) {
        // Allow creating or updating by key
        return this.settingsService.upsert(dto);
    }

    @Get()
    findAll() {
        return this.settingsService.findAll();
    }

    @Get(':key')
    findOne(@Param('key') key: string) {
        return this.settingsService.findOne(key);
    }

    // Note: Standard CRUD might not fit key-value well, but let's support basic operations.
}
