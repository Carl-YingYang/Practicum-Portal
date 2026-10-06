CREATE TABLE "PracticumTemplate" (
 "id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0, "draftJson" TEXT NOT NULL,
 "wordBytes" BLOB, "wordName" TEXT, "exampleBytes" BLOB, "exampleName" TEXT,
 "archived" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "PracticumTemplate_schoolId_idx" ON "PracticumTemplate"("schoolId");
CREATE TABLE "PracticumTemplateVersion" (
 "id" TEXT NOT NULL PRIMARY KEY, "templateId" TEXT NOT NULL, "number" INTEGER NOT NULL,
 "schemaJson" TEXT NOT NULL, "wordBytes" BLOB NOT NULL, "wordName" TEXT NOT NULL,
 "exampleBytes" BLOB, "exampleName" TEXT, "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PracticumTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PracticumTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PracticumTemplateVersion_templateId_number_key" ON "PracticumTemplateVersion"("templateId", "number");
CREATE TABLE "PracticumAssignment" (
 "id" TEXT NOT NULL PRIMARY KEY, "versionId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
 "reportId" TEXT NOT NULL, "dueDate" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PracticumAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "PracticumTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PracticumAssignment_reportId_key" ON "PracticumAssignment"("reportId");
CREATE UNIQUE INDEX "PracticumAssignment_versionId_studentId_key" ON "PracticumAssignment"("versionId", "studentId");
