import { readCollection } from "@/server/read-api";
export const dynamic = "force-dynamic";
export async function GET() {
  return readCollection("timeLogs");
}
