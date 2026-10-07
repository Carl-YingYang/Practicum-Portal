ALTER TABLE "ReportAsset" ADD COLUMN "contentHash" TEXT;
CREATE INDEX "ReportAsset_reportId_contentHash_idx" ON "ReportAsset"("reportId", "contentHash");
