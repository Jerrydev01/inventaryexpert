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

export default async function LocationDetailPage({
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

  const { data: location } = await supabase
    .from("locations")
    .select("id, name, type, is_active, parent_id")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!location) notFound();

  const { data: balances } = await supabase
    .from("inventory_balances")
    .select("quantity, item_id, items(name, unit, sku)")
    .eq("location_id", id)
    .eq("company_id", profile.company_id)
    .order("quantity", { ascending: false });

  const totalItems = balances?.filter((b) => (b.quantity ?? 0) > 0).length ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {location.name}
            </h1>
            <Badge variant="outline" className="capitalize">
              {location.type}
            </Badge>
            {!location.is_active && (
              <Badge variant="outline" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} item type{totalItems !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RoleGate
            allow={["admin", "manager"]}
            role={profile.role as UserRoleEnum}
          >
            <Link
              href={`/dashboard/locations/${id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit
            </Link>
          </RoleGate>
          <Link
            href={`/dashboard/stock/in?toLocationId=${id}`}
            className={buttonVariants({ size: "sm" })}
          >
            Receive Stock
          </Link>
          <Link
            href={`/dashboard/stock/transfer?fromLocationId=${id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Transfer From
          </Link>
        </div>
      </div>

      {/* Stock at location */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
          <CardDescription>
            All items currently held at this location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!balances || balances.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No stock recorded at this location yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => {
                  const item = b.items as {
                    name: string;
                    unit: string;
                    sku: string | null;
                  } | null;
                  return (
                    <TableRow key={b.item_id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/items/${b.item_id}`}
                          className="hover:underline"
                        >
                          {item?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item?.sku ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <BalanceBadge
                          quantity={b.quantity ?? 0}
                          unit={item?.unit ?? ""}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/stock/out?itemId=${b.item_id}&fromLocationId=${id}`}
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
    </div>
  );
}
