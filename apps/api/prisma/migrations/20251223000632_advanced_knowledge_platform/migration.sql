-- CreateEnum
CREATE TYPE "RequirementMaturity" AS ENUM ('DRAFT', 'STANDARD', 'VERIFIED');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('DEPENDS_ON', 'CONFLICTS_WITH', 'DERIVED_FROM', 'REFINES', 'ALTERNATE_OF');

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "hasCondition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAtomic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isTestable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maturity" "RequirementMaturity" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "trustGrade" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "RequirementRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "weight" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMetric" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "adoptionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "modificationRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "roiEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMetadata" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "modelName" TEXT,
    "promptHash" TEXT,
    "sourcePath" JSONB,
    "reasoning" TEXT,
    "biasScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContext" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "techStack" JSONB,
    "styleGuide" JSONB,
    "forbiddenTech" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgStandard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,

    CONSTRAINT "OrgStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "deciderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetMetric_requirementId_key" ON "AssetMetric"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "AiMetadata_requirementId_key" ON "AiMetadata"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContext_projectId_key" ON "ProjectContext"("projectId");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRelation" ADD CONSTRAINT "RequirementRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRelation" ADD CONSTRAINT "RequirementRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMetric" ADD CONSTRAINT "AssetMetric_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMetadata" ADD CONSTRAINT "AiMetadata_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContext" ADD CONSTRAINT "ProjectContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStandard" ADD CONSTRAINT "OrgStandard_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "ProjectContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_deciderId_fkey" FOREIGN KEY ("deciderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
