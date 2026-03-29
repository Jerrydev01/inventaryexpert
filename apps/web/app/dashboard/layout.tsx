import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ModuleProvider } from "@/lib/module-context";
import { createClient } from "@/lib/supabase/server";
import { getModule } from "@/modules/registry";
import type { Sector } from "@inventaryexpert/types";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, companies(name, sector)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // User is authenticated but has no profile row — likely a failed
    // account-setup trigger. Rendering an inline error instead of redirecting
    // to /login prevents the auth layout from bouncing them back here in a loop.
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">Account setup incomplete</h1>
          <p className="text-sm text-muted-foreground">
            Your account profile could not be found. Sign out and try again, or
            contact support if the problem persists.
          </p>
          <a
            href="/auth/sign-out"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign out
          </a>
        </div>
      </div>
    );
  }

  const company = profile.companies as {
    name?: string;
    sector?: string;
  } | null;
  const sector = company?.sector ?? "other";
  const module = getModule(sector as Sector);
  const sidebarUser = {
    name: company?.name?.trim() || module.displayName,
    email: user.email ?? "",
    avatar: "",
  };

  return (
    <div data-theme={sector} className="theme-wrapper">
      <ModuleProvider module={module}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as CSSProperties
          }
        >
          <AppSidebar variant="inset" user={sidebarUser} />
          <SidebarInset>
            <SiteHeader pageTitle="Dashboard" />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </ModuleProvider>
    </div>
  );
}
