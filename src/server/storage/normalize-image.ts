import sharp from "sharp";
/** One provider-independent normalization boundary before quota checks/storage. */
export async function normalizeImage(bytes: Buffer) {
  const image = sharp(bytes, { limitInputPixels: 40000000 }).rotate(),
    info = await image.metadata();
  if (!["png", "jpeg"].includes(info.format ?? ""))
    throw Error("Use PNG or JPEG.");
  const result = await image
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat(
      info.format as "png" | "jpeg",
      info.format === "jpeg"
        ? { quality: 85, mozjpeg: true }
        : { compressionLevel: 9 },
    )
    .toBuffer({ resolveWithObject: true });
  return {
    bytes: result.data,
    mime: info.format === "png" ? "image/png" : "image/jpeg",
    width: result.info.width,
    height: result.info.height,
  };
}
