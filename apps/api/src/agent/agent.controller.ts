
import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { AgentOrchestrator } from './agent.orchestrator';
import { PrismaService } from '../prisma.service';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly orchestrator: AgentOrchestrator,
    private readonly prisma: PrismaService
  ) {}

  @Post('jobs')
  async createJob(@Body() body: { goal: string, userId?: string }) {
    const job = await this.orchestrator.createJob(body.goal, body.userId || 'system');
    // Auto-start for now
    this.orchestrator.startJob(job.id);
    return job;
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    const job = await this.prisma.agentJob.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } }
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  @Get('jobs')
  async listJobs() {
    return this.prisma.agentJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });
  }
}
