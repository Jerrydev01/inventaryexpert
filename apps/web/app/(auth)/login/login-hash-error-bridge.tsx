"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LoginHashErrorBridge() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.startsWith("#")) {
      return;
    }

    const hashParams = new URLSearchParams(hash.slice(1));
    const error = hashParams.get("error");
    const errorCode = hashParams.get("error_code");
    const errorDescription = hashParams.get("error_description");

    if (!error && !errorCode && !errorDescription) {
      return;
    }

    const message =
      errorDescription ??
      errorCode ??
      error ??
      "Invalid or expired reset link. Please request a new one.";

    router.replace(`/forgot-password?error=${encodeURIComponent(message)}`);
  }, [router]);

  return null;
}
