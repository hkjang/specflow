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

  // --- Relation Management ---

  @Post('relations')
  addRelation(@Body() body: { sourceId: string; targetId: string; type: string; reason?: string }) {
    return this.requirementsService.addRelation(body.sourceId, body.targetId, body.type, body.reason);
  }

  @Get(':id/relations')
  getRelations(@Param('id') id: string) {
    return this.requirementsService.getRelations(id);
  }

  @Delete('relations/:relationId')
  removeRelation(@Param('relationId') relationId: string) {
    return this.requirementsService.removeRelation(relationId);
  }

  // --- Audit & Health ---

  @Get(':id/audit')
  getAuditLogs(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.requirementsService.getAuditLogs(id, limit ? +limit : 50);
  }

  @Get('health/stats')
  getHealthStats() {
    return this.requirementsService.getHealthStats();
  }

  @Get(':id/dependencies')
  checkDependencies(@Param('id') id: string) {
    return this.requirementsService.checkDependencies(id);
  }

  // --- Archive & Restore ---

  @Post('global/archive')
  bulkArchive(@Body() body: { ids: string[] }) {
    return this.requirementsService.bulkArchive(body.ids);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.requirementsService.restore(id);
  }

  // --- AI Translation & Complexity ---

  @Post(':id/translate')
  translateRequirement(@Param('id') id: string, @Body() body: { lang: string }) {
    return this.requirementsService.translateRequirement(id, body.lang);
  }

  @Get(':id/complexity')
  getComplexityMetrics(@Param('id') id: string) {
    return this.requirementsService.getComplexityMetrics(id);
  }

  // --- Reports & Analytics ---

  @Post('reports/generate')
  generateReport(@Body() body: { ids?: string[]; status?: string; format?: 'summary' | 'detailed' | 'executive' }) {
    return this.requirementsService.generateReport(body);
  }

  @Get('analytics/graph')
  getGraphData() {
    return this.requirementsService.getGraphData();
  }

  @Get('analytics/risk')
  analyzeRisk() {
    return this.requirementsService.analyzeRisk();
  }

  @Get('analytics/coverage')
  getCoverageMatrix() {
    return this.requirementsService.getCoverageMatrix();
  }

  @Get('analytics/changelog')
  getChangelog(@Query('from') from: string, @Query('to') to: string) {
    return this.requirementsService.getChangelog(from, to);
  }

  // --- AI Smart Features ---

  @Post(':id/smart-split')
  smartSplit(@Param('id') id: string) {
    return this.requirementsService.smartSplit(id);
  }

  @Post('global/prioritize')
  autoPrioritize(@Body() body: { ids: string[] }) {
    return this.requirementsService.autoPrioritize(body.ids);
  }

  @Get(':id/compliance')
  checkCompliance(@Param('id') id: string) {
    return this.requirementsService.checkCompliance(id);
  }

  // --- Collaboration ---

  @Post('bookmarks')
  addBookmark(@Body() body: { userId: string; requirementId: string }) {
    return this.requirementsService.addBookmark(body.userId, body.requirementId);
  }

  @Get('bookmarks/:userId')
  getBookmarks(@Param('userId') userId: string) {
    return this.requirementsService.getBookmarks(userId);
  }

  @Delete('bookmarks/:bookmarkId')
  removeBookmark(@Param('bookmarkId') bookmarkId: string) {
    return this.requirementsService.removeBookmark(bookmarkId);
  }

  @Post(':id/watchers')
  addWatcher(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.requirementsService.addWatcher(id, body.userId);
  }

  @Get(':id/watchers')
  getWatchers(@Param('id') id: string) {
    return this.requirementsService.getWatchers(id);
  }

  // --- AI Advanced ---

  @Get('ai/compare/:id1/:id2')
  aiCompare(@Param('id1') id1: string, @Param('id2') id2: string) {
    return this.requirementsService.aiCompare(id1, id2);
  }

  @Get('search/semantic')
  semanticSearch(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.requirementsService.semanticSearch(query, limit ? +limit : 20);
  }

  @Post('global/bulk-approve')
  bulkApprove(@Body() body: { ids: string[]; approverId: string; minQualityScore?: number }) {
    return this.requirementsService.bulkApprove(body.ids, body.approverId, body.minQualityScore);
  }

  @Get(':id/history-diff')
  getHistoryDiff(@Param('id') id: string, @Query('v1') v1: number, @Query('v2') v2: number) {
    return this.requirementsService.getHistoryDiff(id, +v1, +v2);
  }

  @Get('analytics/trend')
  getTrendAnalysis(@Query('days') days?: number) {
    return this.requirementsService.getTrendAnalysis(days ? +days : 30);
  }

  @Get('library/blocks')
  getReusableBlocks() {
    return this.requirementsService.getReusableBlocks();
  }

  @Post('webhook/trigger')
  triggerWebhook(@Body() body: { event: string; payload: any; webhookUrl?: string }) {
    return this.requirementsService.triggerWebhook(body.event, body.payload, body.webhookUrl);
  }

  // --- Phase 8: Final Advanced Features ---

  @Get(':id/suggest-actions')
  aiAutoSuggest(@Param('id') id: string) {
    return this.requirementsService.aiAutoSuggest(id);
  }

  @Post('analytics/batch-quality')
  batchQualityAnalysis(@Body() body: { ids: string[] }) {
    return this.requirementsService.batchQualityAnalysis(body.ids);
  }

  @Get(':id/impact')
  analyzeImpact(@Param('id') id: string) {
    return this.requirementsService.analyzeImpact(id);
  }

  @Get('analytics/orphans')
  findOrphans() {
    return this.requirementsService.findOrphans();
  }

  @Get('export/traceability-matrix')
  exportTraceabilityMatrix() {
    return this.requirementsService.exportTraceabilityMatrix();
  }

  @Get('analytics/completeness')
  checkCompleteness() {
    return this.requirementsService.checkCompleteness();
  }

  @Get(':id/auto-link')
  autoLink(@Param('id') id: string, @Query('threshold') threshold?: number) {
    return this.requirementsService.autoLink(id, threshold ? +threshold / 100 : 0.6);
  }

  @Post('global/bulk-translate')
  bulkTranslate(@Body() body: { ids: string[]; targetLang: string }) {
    return this.requirementsService.bulkTranslate(body.ids, body.targetLang);
  }

  @Get('dashboard/summary')
  getDashboardSummary() {
    return this.requirementsService.getDashboardSummary();
  }
}
