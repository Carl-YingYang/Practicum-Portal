import { readCollection } from "@/server/read-api";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      studentId: string;
    }>;
  },
) {
  return readCollection("timeLogs", (await context.params).studentId);
}
