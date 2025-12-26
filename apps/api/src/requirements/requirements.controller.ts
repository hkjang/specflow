import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementEnrichmentService } from './requirement-enrichment.service';
import { DuplicateDetectionService } from './duplicate-detection.service';

@Controller('requirements')
export class RequirementsController {
  constructor(
    private readonly requirementsService: RequirementsService,
    private readonly enrichmentService: RequirementEnrichmentService,
    private readonly duplicateService: DuplicateDetectionService
  ) { }

  @Post()
  create(@Body() createRequirementDto: CreateRequirementDto) {
    return this.requirementsService.create(createRequirementDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.requirementsService.findAll({ status, search, category, page: page ? +page : 1, limit: limit ? +limit : 50 });
  }

  @Post('global/bulk-status')
  bulkUpdateStatus(@Body() body: { ids: string[]; status: string }) {
    return this.requirementsService.bulkUpdateStatus(body.ids, body.status);
  }

  @Post('global/bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.requirementsService.bulkDelete(body.ids);
  }

  // --- AI Enrichment Endpoints ---
  @Get('enrichment/pending')
  findRequirementsWithoutMetadata(@Query('limit') limit?: number) {
    return this.enrichmentService.findRequirementsWithoutMetadata(limit ? +limit : 50);
  }

  @Post('enrichment/batch')
  batchEnrich(@Body() body: { limit?: number }) {
    return this.enrichmentService.batchEnrich(body.limit || 20);
  }

  @Post(':id/enrich')
  enrichSingle(@Param('id') id: string) {
    return this.enrichmentService.enrichRequirement(id);
  }
  // --- End AI Enrichment ---

  // --- Duplicate Detection Endpoints ---
  @Get('duplicates/scan')
  scanDuplicates() {
    return this.duplicateService.scanExistingDuplicates(false);
  }

  @Post('duplicates/deprecate')
  deprecateDuplicates() {
    return this.duplicateService.scanExistingDuplicates(true);
  }

  @Get('duplicates/compare/:id1/:id2')
  compareTwoRequirements(@Param('id1') id1: string, @Param('id2') id2: string) {
    return this.duplicateService.getSimilarityDetails(id1, id2);
  }
  // --- End Duplicate Detection ---

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
    return this.requirementsService.addComment(id, body.content, body.userId || 'system');
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.requirementsService.getComments(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
  }

  @Post('ai/improve')
  async getAiImprovement(@Body() body: { content: string }) {
    return this.requirementsService.getAiImprovement(body.content);
  }
}
