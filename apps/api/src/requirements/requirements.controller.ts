import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) { }

  @Post()
  create(@Body() createRequirementDto: CreateRequirementDto) {
    return this.requirementsService.create(createRequirementDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.requirementsService.findAll({ status, search, page: page ? +page : 1, limit: limit ? +limit : 50 });
  }

  @Post('global/bulk-status')
  bulkUpdateStatus(@Body() body: { ids: string[]; status: string }) {
    return this.requirementsService.bulkUpdateStatus(body.ids, body.status);
  }

  @Post('global/bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.requirementsService.bulkDelete(body.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRequirementDto: UpdateRequirementDto) {
    return this.requirementsService.update(id, updateRequirementDto);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: { content: string, userId: string }) {
    return this.requirementsService.addComment(id, body.content, body.userId || 'system'); // Fallback user
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.requirementsService.getComments(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
  }
}

