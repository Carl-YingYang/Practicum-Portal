CREATE TABLE "PracticumReport" (
 "id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0, "stateJson" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "PracticumReport_schoolId_idx" ON "PracticumReport"("schoolId");
CREATE TABLE "ReportAsset" (
 "id" TEXT NOT NULL PRIMARY KEY, "reportId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "mime" TEXT NOT NULL, "kind" TEXT NOT NULL, "sectionId" TEXT, "caption" TEXT NOT NULL DEFAULT '',
 "rotation" INTEGER NOT NULL DEFAULT 0, "width" INTEGER, "height" INTEGER, "size" INTEGER NOT NULL, "order" INTEGER NOT NULL DEFAULT 0, "bytes" BLOB NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ReportAsset_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PracticumReport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReportAsset_reportId_idx" ON "ReportAsset"("reportId");
ALTER TABLE "PortalAccount" ADD COLUMN "notificationPreferencesJson" TEXT NOT NULL DEFAULT '{}';
