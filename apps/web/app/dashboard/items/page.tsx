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
import { getModule } from "@/modules/registry";
import type { Sector, UserRoleEnum } from "@inventaryexpert/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ItemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, role, companies(sector)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const sector = ((profile.companies as { sector?: string } | null)?.sector ??
    "other") as Sector;
  const module = getModule(sector);
  const labels = module.labels;

  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, sku, unit, category, is_tracked_asset, is_active")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{labels.items}</h1>
          <p className="text-sm text-muted-foreground">
            Manage your {labels.item.toLowerCase()} catalogue
          </p>
        </div>
        <RoleGate
          allow={["admin", "manager"]}
          role={profile.role as UserRoleEnum}
        >
          <Link href="/dashboard/items/new" className={buttonVariants()}>
            Add {labels.item}
          </Link>
        </RoleGate>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.item} Catalogue</CardTitle>
          <CardDescription>
            {items?.length ?? 0} active {labels.item.toLowerCase()}
            {items?.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load items. Please try again.
            </p>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-muted-foreground">
                No {labels.items.toLowerCase()} yet. Add your first{" "}
                {labels.item.toLowerCase()} to get started.
              </p>
              <RoleGate
                allow={["admin", "manager"]}
                role={profile.role as UserRoleEnum}
              >
                <Link
                  href="/dashboard/items/new"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Add your first {labels.item.toLowerCase()}
                </Link>
              </RoleGate>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/items/${item.id}`}
                        className="hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.sku ?? "—"}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.is_tracked_asset ? "Asset" : "Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/items/${item.id}`}
                        className={buttonVariants({
                          size: "sm",
                          variant: "ghost",
                        })}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
