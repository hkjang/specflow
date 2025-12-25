import { Controller, Get, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    findAll() {
        return this.projectsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Post()
    create(@Body() data: { name: string; description?: string; partnerIds?: string[] }) {
        return this.projectsService.create(data);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: { name?: string; description?: string; partnerIds?: string[] }) {
        return this.projectsService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.projectsService.remove(id);
    }
}
