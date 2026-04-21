export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {handleTotpChallenge} from "@/lib/auth/server";

export async function POST(request: Request) {
  const formData = await request.formData();

  return handleTotpChallenge(request, formData);
}

