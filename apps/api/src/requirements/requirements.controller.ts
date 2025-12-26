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
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('trustMin') trustMin?: number,
    @Query('businessId') businessId?: string,
  ) {
    return this.requirementsService.findAll({ 
      status, 
      search, 
      category, 
      page: page ? +page : 1, 
      limit: limit ? +limit : 50,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
      trustMin: trustMin ? +trustMin : undefined,
      businessId,
    });
  }

  @Post('global/bulk-status')
  bulkUpdateStatus(@Body() body: { ids: string[]; status: string }) {
    return this.requirementsService.bulkUpdateStatus(body.ids, body.status);
  }

  @Post('global/bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.requirementsService.bulkDelete(body.ids);
  }

  @Post('global/bulk-category')
  bulkAssignCategory(@Body() body: { ids: string[]; categoryId: string }) {
    return this.requirementsService.bulkAssignCategory(body.ids, body.categoryId);
  }

  @Post('global/import')
  bulkImport(@Body() body: { items: { title: string; content: string; status?: string; businessName?: string }[]; creatorId: string }) {
    return this.requirementsService.bulkImport(body.items, body.creatorId || 'system');
  }

  @Post(':id/clone')
  cloneRequirement(@Param('id') id: string, @Body() body: { newCode?: string }) {
    return this.requirementsService.cloneRequirement(id, { newCode: body.newCode });
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

  // --- Statistics & Export Endpoints ---
  @Get('stats')
  getStats() {
    return this.requirementsService.getStats();
  }

  @Get('export')
  exportToCsv(
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.requirementsService.exportToCsv({ status, category });
  }
  // --- End Statistics & Export ---

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

  @Get(':id/related')
  getRelatedRequirements(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('threshold') threshold?: number,
  ) {
    return this.requirementsService.getRelatedRequirements(
      id,
      limit ? +limit : 5,
      threshold ? +threshold : 0.6
    );
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.requirementsService.getTimeline(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
  }

  @Post('ai/improve')
  async getAiImprovement(@Body() body: { content: string }) {
    return this.requirementsService.getAiImprovement(body.content);
  }

  // --- Advanced Analysis & Workflow ---

  @Get(':id/quality')
  analyzeQuality(@Param('id') id: string) {
    return this.requirementsService.analyzeQuality(id);
  }

  @Get('compare/:id1/:id2')
  compareRequirements(@Param('id1') id1: string, @Param('id2') id2: string) {
    return this.requirementsService.compareRequirements(id1, id2);
  }

  @Post('merge')
  mergeRequirements(@Body() body: { 
    sourceId: string; 
    targetId: string; 
    strategy?: 'KEEP_TARGET' | 'KEEP_SOURCE' | 'COMBINE';
    deprecateSource?: boolean;
  }) {
    return this.requirementsService.mergeRequirements(
      body.sourceId, 
      body.targetId, 
      { strategy: body.strategy || 'COMBINE', deprecateSource: body.deprecateSource ?? true }
    );
  }

  @Post(':id/request-approval')
  requestApproval(@Param('id') id: string, @Body() body: { requesterId: string; reviewerId?: string }) {
    return this.requirementsService.requestApproval(id, body.requesterId, body.reviewerId);
  }

  @Post('approval/:approvalId/process')
  processApproval(
    @Param('approvalId') approvalId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; comment?: string }
  ) {
    return this.requirementsService.processApproval(approvalId, body.decision, body.comment);
  }

  @Post('global/validate')
  batchValidate(@Body() body: { ids: string[] }) {
    return this.requirementsService.batchValidate(body.ids);
  }

  // --- UX Enhancement Endpoints ---

  @Get('templates')
  getTemplates(@Query('category') category?: string) {
    return this.requirementsService.getTemplates(category);
  }

  @Post('templates/create')
  createFromTemplate(@Body() body: { 
    templateId: string; 
    replacements: Record<string, string>; 
    creatorId: string;
  }) {
    return this.requirementsService.createFromTemplate(body.templateId, body.replacements, body.creatorId);
  }

  @Get(':id/versions')
  getVersionHistory(@Param('id') id: string) {
    return this.requirementsService.getVersionHistory(id);
  }

  @Get('search/suggestions')
  getSearchSuggestions(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.requirementsService.getSearchSuggestions(query, limit ? +limit : 10);
  }

  @Get('activity/recent')
  getRecentActivity(@Query('limit') limit?: number) {
    return this.requirementsService.getRecentActivity(limit ? +limit : 20);
  }

  @Get(':id/tags')
  extractTags(@Param('id') id: string) {
    return this.requirementsService.extractTags(id);
  }

  @Post('global/summary')
  generateSummary(@Body() body: { ids: string[] }) {
    return this.requirementsService.generateSummary(body.ids);
  }

  @Post('global/batch-enrich')
  batchEnrichWithProgress(@Body() body: { ids: string[] }) {
    return this.requirementsService.batchEnrichWithProgress(body.ids);
  }
}
