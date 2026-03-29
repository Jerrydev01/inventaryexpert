import {
  MovementAreaChart,
  TransactionTypeBarChart,
} from "@/components/dashboard/InventoryCharts";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { TransactionTypeEnum } from "@inventaryexpert/types";
import Link from "next/link";
import { redirect } from "next/navigation";

const LOW_STOCK_THRESHOLD = 5;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const awaitedSearchParams = await searchParams;
  const range = (awaitedSearchParams.range as string) || "14d";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, companies(name, sector)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const companyId = profile.company_id;

  let daysToFetch = 14;
  if (range === "30d") daysToFetch = 30;
  if (range === "7d") daysToFetch = 7;

  const sinceDate = new Date(
    Date.now() - daysToFetch * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { count: itemCount },
    { count: locationCount },
    { count: txCount },
    { data: recentTx },
    { data: lowStockRows },
    { data: allTxDateRange },
    { data: allTxTypes },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("stock_transactions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("stock_transactions")
      .select(
        "id, transaction_type, quantity, created_at, item_id, items(name, unit)",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("inventory_balances")
      .select(
        "quantity, item_id, location_id, items(name, unit), locations(name)",
      )
      .eq("company_id", companyId)
      .lte("quantity", LOW_STOCK_THRESHOLD)
      .gt("quantity", 0)
      .order("quantity")
      .limit(6),
    supabase
      .from("stock_transactions")
      .select("transaction_type, created_at")
      .eq("company_id", companyId)
      .gte("created_at", sinceDate),
    supabase
      .from("stock_transactions")
      .select("transaction_type")
      .eq("company_id", companyId),
  ]);

  // Build day-by-day chart data
  function getPastDays(num: number): string[] {
    return Array.from({ length: num }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (num - 1 - i));
      return d.toISOString().slice(0, 10);
    });
  }

  const days = getPastDays(daysToFetch);
  const dailyMap: Record<
    string,
    { in: number; out: number; transfer: number }
  > = Object.fromEntries(days.map((d) => [d, { in: 0, out: 0, transfer: 0 }]));
  for (const tx of allTxDateRange ?? []) {
    const day = tx.created_at.slice(0, 10);
    if (!dailyMap[day]) continue;
    if (tx.transaction_type === "stock_in") dailyMap[day].in += 1;
    else if (tx.transaction_type === "stock_out") dailyMap[day].out += 1;
    else if (tx.transaction_type === "transfer") dailyMap[day].transfer += 1;
  }
  const chartData = days.map((d) => ({
    date: d.slice(5), // MM-DD
    ...dailyMap[d],
  }));

  // Type breakdown
  const typeCounts: Record<string, number> = {};
  for (const tx of allTxTypes ?? []) {
    typeCounts[tx.transaction_type] =
      (typeCounts[tx.transaction_type] ?? 0) + 1;
  }
  const typeChartData = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count,
  }));

  return (
    <div className="relative flex flex-1 flex-col gap-8 p-4 pt-6 lg:p-8 overflow-hidden">
      {/* Ambient gradient blobs */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute top-[40%] -left-48 h-[380px] w-[380px] rounded-full bg-chart-3/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-chart-1/[0.04] blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Live Overview
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor your inventory metrics and manage stock operations.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center justify-center rounded-full border border-border/60 bg-muted/60 backdrop-blur-sm p-1 text-muted-foreground shadow-sm">
            {(
              [
                { label: "7 Days", value: "7d" },
                { label: "14 Days", value: "14d" },
                { label: "30 Days", value: "30d" },
              ] as const
            ).map((item) => (
              <Link
                key={item.value}
                href={`/dashboard?range=${item.value}`}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1 text-sm font-medium transition-all ${
                  range === item.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            href="/dashboard/locations"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className:
                "h-9 hidden sm:flex rounded-full border-border/60 bg-card/80 hover:bg-muted/80 backdrop-blur-sm gap-1.5",
            })}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </Link>
        </div>
      </div>

      {/* Quick Actions / Shortcuts */}
      <div
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
        role="navigation"
        aria-label="Quick actions"
      >
        <Link
          href="/dashboard/stock/in"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          </div>
          <span className="text-sm font-medium">Receive Stock</span>
        </Link>
        <Link
          href="/dashboard/stock/out"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </div>
          <span className="text-sm font-medium">Issue Stock</span>
        </Link>
        <Link
          href="/dashboard/stock/transfer"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 14 20 9 15 4" />
              <line x1="4" x2="20" y1="9" y2="9" />
              <polyline points="9 10 4 15 9 20" />
              <line x1="20" x2="4" y1="15" y2="15" />
            </svg>
          </div>
          <span className="text-sm font-medium">Transfer</span>
        </Link>
        <Link
          href="/dashboard/stock/return"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-sm font-medium">Return</span>
        </Link>
        <Link
          href="/dashboard/stock/adjust"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="rounded-full bg-primary/10 p-2.5 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <span className="text-sm font-medium">Adjust</span>
        </Link>
      </div>

      {/* Summary cards */}
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        role="region"
        aria-label="Key metrics"
      >
        <StatCard
          title="Active Items"
          value={itemCount ?? 0}
          href="/dashboard/items"
          linkLabel="Manage catalogue"
        />
        <StatCard
          title="Locations"
          value={locationCount ?? 0}
          href="/dashboard/locations"
          linkLabel="View all zones"
        />
        <StatCard
          title="Total Transactions"
          value={txCount ?? 0}
          href="/dashboard/transactions"
          linkLabel="View history logs"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockRows?.length ?? 0}
          href="/dashboard/balances/low-stock"
          linkLabel="Review low stock"
          highlight={(lowStockRows?.length ?? 0) > 0}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-5 grid-cols-1 xl:grid-cols-3">
        {/* Movement Velocity chart */}
        <Card className="xl:col-span-2 overflow-hidden border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-br from-muted/40 to-transparent border-b border-border/40">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Movement Velocity
              </CardTitle>
              <CardDescription className="text-xs">
                Daily stock volume — last {daysToFetch} days
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />
                In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Out
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--chart-4)]" />
                Transfer
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-5 h-[300px] pb-3">
            <MovementAreaChart data={chartData} />
          </CardContent>
        </Card>

        {/* Operation Types chart */}
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardHeader className="pb-3 bg-gradient-to-br from-muted/40 to-transparent border-b border-border/40">
            <CardTitle className="text-base font-semibold">
              Operation Types
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown by transaction type
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 h-[300px] pb-3">
            <TransactionTypeBarChart data={typeChartData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 grid-cols-1 xl:grid-cols-3">
        {/* ── Recent Activity feed ── */}
        <Card className="xl:col-span-2 overflow-hidden border-border/60 shadow-sm p-0">
          <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-border/40 bg-gradient-to-br from-muted/40 to-transparent">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Latest stock operations across all locations
              </CardDescription>
            </div>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              View full log
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </CardHeader>

          {!recentTx || recentTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">
                No operations yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Stock movements will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {recentTx.map((tx, idx) => {
                const item = tx.items as { name: string; unit: string } | null;
                const txType = tx.transaction_type as TransactionTypeEnum;

                // Icon + colour per type
                const typeConfig: Record<
                  TransactionTypeEnum,
                  {
                    icon: React.ReactNode;
                    bg: string;
                    text: string;
                    label: string;
                  }
                > = {
                  stock_in: {
                    label: "Stock In",
                    bg: "bg-emerald-100 dark:bg-emerald-950",
                    text: "text-emerald-600 dark:text-emerald-400",
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                    ),
                  },
                  stock_out: {
                    label: "Issue",
                    bg: "bg-orange-100 dark:bg-orange-950",
                    text: "text-orange-600 dark:text-orange-400",
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                    ),
                  },
                  transfer: {
                    label: "Transfer",
                    bg: "bg-blue-100 dark:bg-blue-950",
                    text: "text-blue-600 dark:text-blue-400",
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="15 14 20 9 15 4" />
                        <line x1="4" x2="20" y1="9" y2="9" />
                        <polyline points="9 10 4 15 9 20" />
                        <line x1="20" x2="4" y1="15" y2="15" />
                      </svg>
                    ),
                  },
                  return: {
                    label: "Return",
                    bg: "bg-yellow-100 dark:bg-yellow-950",
                    text: "text-yellow-700 dark:text-yellow-400",
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-4.78" />
                      </svg>
                    ),
                  },
                  adjustment: {
                    label: "Adjustment",
                    bg: "bg-violet-100 dark:bg-violet-950",
                    text: "text-violet-600 dark:text-violet-400",
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" x2="18" y1="20" y2="10" />
                        <line x1="12" x2="12" y1="20" y2="4" />
                        <line x1="6" x2="6" y1="20" y2="14" />
                      </svg>
                    ),
                  },
                };
                const cfg = typeConfig[txType] ?? typeConfig.adjustment;

                const dateStr = new Date(tx.created_at).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    {/* Icon bubble */}
                    <div
                      className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.text}`}
                    >
                      {cfg.icon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {item?.name ?? "Unknown item"}
                        </span>
                        <span
                          className={`hidden sm:inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${cfg.bg} ${cfg.text} border-current/20`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dateStr}
                      </p>
                    </div>

                    {/* Volume pill */}
                    <div className="shrink-0 text-right">
                      <div
                        className={`inline-flex items-baseline gap-0.5 rounded-lg px-2.5 py-1 ${cfg.bg}`}
                      >
                        <span
                          className={`text-sm font-bold tabular-nums ${cfg.text}`}
                        >
                          {tx.quantity}
                        </span>
                        {item?.unit && (
                          <span
                            className={`text-[10px] font-medium ${cfg.text} opacity-70`}
                          >
                            {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-6 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing last {recentTx?.length ?? 0} operations
            </span>
            <Link
              href="/dashboard/transactions"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "h-7 text-xs",
              })}
            >
              View all transactions →
            </Link>
          </div>
        </Card>

        {/* ── Low Stock / Action Required ── */}
        <Card className="flex flex-col overflow-hidden border-border/60 shadow-sm p-0">
          {/* Header */}
          <CardHeader className="pb-4 pt-5 px-5 border-b border-border/40 bg-gradient-to-br from-muted/40 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Stock Alerts
                  {(lowStockRows?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1.5">
                      {lowStockRows?.length}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Items below reorder threshold
                </CardDescription>
              </div>
              {(lowStockRows?.length ?? 0) === 0 && (
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            {!lowStockRows || lowStockRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[220px] gap-2">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  All clear
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                  Every item is within its safe stock level.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 px-1">
                {lowStockRows.map((b) => {
                  const item = b.items as { name: string; unit: string } | null;
                  const loc = b.locations as { name: string } | null;
                  const qty = b.quantity ?? 0;
                  const isEmpty = qty === 0;
                  // Progress: 0 → LOW_STOCK_THRESHOLD mapped to 0–100%
                  const pct = Math.min(
                    100,
                    Math.round((qty / LOW_STOCK_THRESHOLD) * 100),
                  );

                  return (
                    <div
                      key={`${b.item_id}-${b.location_id}`}
                      className="flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {loc?.name ?? "—"}
                          </p>
                        </div>
                        <div
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-center ${isEmpty ? "bg-red-100 dark:bg-red-950" : "bg-yellow-100 dark:bg-yellow-950"}`}
                        >
                          <span
                            className={`text-sm font-bold tabular-nums block ${isEmpty ? "text-red-600 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}
                          >
                            {qty}
                          </span>
                          <span
                            className={`text-[9px] font-medium uppercase tracking-wide ${isEmpty ? "text-red-500 dark:text-red-500" : "text-yellow-600 dark:text-yellow-500"}`}
                          >
                            {item?.unit ?? "units"}
                          </span>
                        </div>
                      </div>

                      {/* Stock level bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isEmpty ? "bg-red-500" : pct < 40 ? "bg-orange-400" : "bg-yellow-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {isEmpty ? "Out of stock" : `${pct}% of threshold`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t border-border/40 bg-muted/20 mt-auto">
            <Link
              href="/dashboard/balances/low-stock"
              className={buttonVariants({
                variant:
                  (lowStockRows?.length ?? 0) > 0 ? "destructive" : "outline",
                className: `w-full ${(lowStockRows?.length ?? 0) > 0 ? "bg-destructive/90 hover:bg-destructive" : "bg-background"}`,
              })}
            >
              {(lowStockRows?.length ?? 0) > 0 ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1.5"
                  >
                    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                  </svg>
                  Restock {lowStockRows?.length} item
                  {(lowStockRows?.length ?? 0) > 1 ? "s" : ""}
                </>
              ) : (
                "View all balances"
              )}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
  linkLabel,
  highlight,
}: {
  title: string;
  value: number;
  href: string;
  linkLabel: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
        highlight
          ? "border-destructive/30 shadow-sm shadow-destructive/5 hover:shadow-md hover:shadow-destructive/10"
          : "border-border/60 shadow-sm hover:shadow-md hover:border-primary/20"
      }`}
    >
      {/* Subtle glow blob */}
      <div
        className={`absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
          highlight ? "bg-destructive/15" : "bg-primary/10"
        }`}
      />
      <CardHeader className="pb-2">
        <CardDescription
          className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-destructive/70" : "text-muted-foreground"}`}
        >
          {title}
        </CardDescription>
        <CardTitle
          className={`text-4xl lg:text-5xl font-bold tracking-tighter tabular-nums mt-1 ${
            highlight ? "text-destructive" : "text-foreground"
          }`}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="">
        <Link
          href={href}
          className={`inline-flex items-center text-xs font-medium transition-colors gap-1 ${
            highlight
              ? "text-destructive/70 hover:text-destructive"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          {linkLabel}
          <svg
            className="h-3 w-3 translate-x-0 transition-transform group-hover:translate-x-1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </CardContent>
    </Card>
  );
}
