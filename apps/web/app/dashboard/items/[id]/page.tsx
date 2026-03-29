import { BalanceBadge } from "@/components/inventory/BalanceBadge";
import { RoleGate } from "@/components/inventory/RoleGate";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import type { UserRoleEnum } from "@inventaryexpert/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: item } = await supabase
    .from("items")
    .select(
      "id, name, sku, unit, category, description, is_tracked_asset, is_active",
    )
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!item) notFound();

  const { data: balances } = await supabase
    .from("inventory_balances")
    .select("quantity, location_id, locations(name, type)")
    .eq("item_id", id)
    .eq("company_id", profile.company_id)
    .order("quantity", { ascending: false });

  const totalQty =
    balances?.reduce((sum, b) => sum + (b.quantity ?? 0), 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
            {!item.is_active && (
              <Badge variant="outline" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {item.sku ? `SKU: ${item.sku} · ` : ""}Unit: {item.unit}
            {item.category ? ` · ${item.category}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RoleGate
            allow={["admin", "manager"]}
            role={profile.role as UserRoleEnum}
          >
            <Link
              href={`/dashboard/items/${id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit
            </Link>
          </RoleGate>
          <Link
            href={`/dashboard/stock/in?itemId=${id}`}
            className={buttonVariants({ size: "sm" })}
          >
            Stock In
          </Link>
          <Link
            href={`/dashboard/stock/out?itemId=${id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Issue
          </Link>
          <Link
            href={`/dashboard/stock/transfer?itemId=${id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Transfer
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stock</CardDescription>
            <CardTitle className="text-3xl">{totalQty}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {item.unit} across {balances?.length ?? 0} location
              {balances?.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Type</CardDescription>
            <CardTitle className="text-lg">
              {item.is_tracked_asset ? "Tracked Asset" : "Stock Item"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {item.is_tracked_asset
                ? "Individual serial tracking"
                : "Quantity-based tracking"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {item.description || "No description provided"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance by location */}
      <Card>
        <CardHeader>
          <CardTitle>Stock by Location</CardTitle>
          <CardDescription>
            Current balance across all locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!balances || balances.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No stock recorded yet. Use &ldquo;Stock In&rdquo; to add stock.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => {
                  const loc = b.locations as {
                    name: string;
                    type: string;
                  } | null;
                  return (
                    <TableRow key={b.location_id}>
                      <TableCell className="font-medium">
                        {loc?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {loc?.type ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <BalanceBadge
                          quantity={b.quantity ?? 0}
                          unit={item.unit}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/stock/out?itemId=${id}&fromLocationId=${b.location_id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          Issue
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        <Link
          href={`/dashboard/transactions?itemId=${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          View all
        </Link>
      </div>
    </div>
  );
}
