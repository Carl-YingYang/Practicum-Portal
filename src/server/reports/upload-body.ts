import { HttpError } from "@/server/security";
/** Bound multipart bodies even when the client omits Content-Length. */
export async function boundedUpload(request: Request) {
  const limit = 33 * 1024 * 1024,
    reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Choose a file.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, "Upload limit: 32 MB per file.");
    }
    chunks.push(value);
  }
  return new Response(new Uint8Array(Buffer.concat(chunks)), {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
}
