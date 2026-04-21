export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {handleLogout} from "@/lib/auth/server";

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
