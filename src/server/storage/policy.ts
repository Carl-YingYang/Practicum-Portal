export function boundedMb(name: string, fallback: number, max = 102400) {
  const mb = Number(process.env[name] ?? fallback);
  return (
    (Number.isFinite(mb) && mb >= 1 && mb <= max ? mb : fallback) * 1024 * 1024
  );
}
export function studentUploadPolicy() {
  return {
    imagesEnabled: process.env.PORTAL_STUDENT_IMAGES !== "false",
    limitBytes: boundedMb("PORTAL_STUDENT_UPLOAD_MB", 3),
    maxImages: Math.max(
      1,
      Math.min(
        100,
        Math.floor(Number(process.env.PORTAL_STUDENT_IMAGE_COUNT)) || 5,
      ),
    ),
  };
}
