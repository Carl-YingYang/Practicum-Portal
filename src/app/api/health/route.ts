export async function GET() {
  return Response.json({
    service: "practo",
    mode: "connected",
    version: "0.4.0",
  });
}
