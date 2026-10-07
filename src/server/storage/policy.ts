export function boundedMb(name: string, fallback: number, max = 102400) {
  const mb = Number(process.env[name] ?? fallback);
  return (
    (Number.isFinite(mb) && mb >= 1 && mb <= max ? mb : fallback) * 1024 * 1024
  );
}
export function studentUploadPolicy() {
  return {
    // Pilot policy: students use placeholders; environment flags cannot bypass it.
    imagesEnabled: false,
    limitBytes: boundedMb("PORTAL_STUDENT_UPLOAD_MB", 3),
    maxImages: 0,
  };
}
