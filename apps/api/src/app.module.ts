import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RequirementsModule } from './requirements/requirements.module';
import { ClassificationModule } from './classification/classification.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { DataMartModule } from './data-mart/data-mart.module';
import { OperationsModule } from './operations/operations.module';
import { KnowledgeEvolutionModule } from './knowledge-evolution/knowledge-evolution.module';
import { AdaptationModule } from './adaptation/adaptation.module';
import { AnalysisModule } from './analysis/analysis.module';
import { GenerationModule } from './generation/generation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExplanationModule } from './explanation/explanation.module';
import { CollectionModule } from './collection/collection.module';
import { PartnerModule } from './partner/partner.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { DevModule } from './dev/dev.module';
import { ExternalApiModule } from './product/product.module';
import { GovernanceModule } from './governance/governance.module';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RequirementsModule,
    DashboardModule,
    ClassificationModule,
    CollectionModule,
    OperationsModule,
    PartnerModule,
    SettingsModule,
    UsersModule,
    DevModule,
    AiModule,
    DataMartModule,
    // New Advanced Modules
    KnowledgeEvolutionModule,
    AdaptationModule,
    AnalysisModule,
    GenerationModule,
    ExternalApiModule,
    ExplanationModule,
    GovernanceModule,
    EnterpriseModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
