import { createActionClient } from "@/lib/supabase/action";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const authErrorCode = requestUrl.searchParams.get("error_code");
  const authErrorDescription = requestUrl.searchParams.get("error_description");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";

  if (authError || authErrorCode || authErrorDescription) {
    const message =
      authErrorDescription ??
      authErrorCode ??
      authError ??
      "Invalid or expired authentication link.";

    return NextResponse.redirect(
      new URL(
        `/forgot-password?error=${encodeURIComponent(message)}`,
        requestUrl.origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/forgot-password?error=${encodeURIComponent("Invalid or expired reset link. Please request a new one.")}`,
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/forgot-password?error=${encodeURIComponent(error.message)}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(safeNextPath, requestUrl.origin));
}
