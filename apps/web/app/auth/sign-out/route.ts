import { createActionClient } from "@/lib/supabase/action";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
