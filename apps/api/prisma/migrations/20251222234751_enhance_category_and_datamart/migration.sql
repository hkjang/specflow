/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Requirement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_categoryId_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "code" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "level" TEXT;

-- AlterTable
ALTER TABLE "Requirement" DROP COLUMN "categoryId";

-- CreateTable
CREATE TABLE "ExternalRequirement" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "originalContent" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "license" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToRequirement" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CategoryToExternalRequirement" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToRequirement_AB_unique" ON "_CategoryToRequirement"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToRequirement_B_index" ON "_CategoryToRequirement"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToExternalRequirement_AB_unique" ON "_CategoryToExternalRequirement"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToExternalRequirement_B_index" ON "_CategoryToExternalRequirement"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- AddForeignKey
ALTER TABLE "_CategoryToRequirement" ADD CONSTRAINT "_CategoryToRequirement_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToRequirement" ADD CONSTRAINT "_CategoryToRequirement_B_fkey" FOREIGN KEY ("B") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToExternalRequirement" ADD CONSTRAINT "_CategoryToExternalRequirement_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToExternalRequirement" ADD CONSTRAINT "_CategoryToExternalRequirement_B_fkey" FOREIGN KEY ("B") REFERENCES "ExternalRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
