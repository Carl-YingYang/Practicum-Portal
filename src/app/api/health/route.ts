import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for uptime monitors and deploy
 * verification. Returns the server timestamp, framework version, and
 * the mock-data mode flag so callers can confirm the API is live and
 * which data backend is active.
 *
 * Response 200:
 *   { status: "ok", service, timestamp, mode, version }
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "practicum-portal-api",
    timestamp: new Date().toISOString(),
    mode: "mock-data",
    version: "1.0.0",
    endpoints: [
      "GET /api/health",
      "GET /api/timesheets?section=&status=&schoolYear=&company=",
      "GET /api/timesheets/:studentId",
      "GET /api/students",
      "GET /api/supervisors",
      "GET /api/forms",
    ],
  });
}
