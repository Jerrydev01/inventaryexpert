"use server";

import { createActionClient } from "@/lib/supabase/action";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type CredentialsResult =
  | {
      email: string;
      password: string;
    }
  | {
      error: string;
    };

function getCredentials(formData: FormData): CredentialsResult {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Invalid form submission." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  return { email: normalizedEmail, password };
}

async function getBaseUrl() {
  const headerList = await headers();
  const origin = headerList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export async function login(formData: FormData) {
  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    redirect(`/login?error=${encodeURIComponent(credentials.error)}`);
  }

  const supabase = await createActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  } else {
    redirect("/dashboard");
  }
}

export async function register(formData: FormData) {
  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    redirect(`/register?error=${encodeURIComponent(credentials.error)}`);
  }

  const supabase = await createActionClient();

  const { error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  } else {
    redirect("/dashboard");
  }
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string") {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Invalid form submission.")}`,
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Email is required.")}`,
    );
  }

  const supabase = await createActionClient();
  const baseUrl = await getBaseUrl();
  const callbackUrl = `${baseUrl}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: callbackUrl,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/forgot-password?success=${encodeURIComponent("Check your email for a reset link.")}`,
  );
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    redirect(
      `/reset-password?error=${encodeURIComponent("Invalid form submission.")}`,
    );
  }

  if (password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`,
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Passwords do not match.")}`,
    );
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/dashboard?success=${encodeURIComponent("Password updated successfully.")}`,
  );
}

export async function logout() {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
