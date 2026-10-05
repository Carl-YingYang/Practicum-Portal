export async function GET() {
  return Response.json({
    service: "practo",
    health: "/api/health",
    session: "/api/auth/session",
    data: "/api/portal",
  });
}
