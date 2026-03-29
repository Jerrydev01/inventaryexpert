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
import { redirect } from "next/navigation";

export default async function LocationsPage() {
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

  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, type, parent_id, is_active")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Manage warehouses, stores, and sites
          </p>
        </div>
        <RoleGate
          allow={["admin", "manager"]}
          role={profile.role as UserRoleEnum}
        >
          <Link href="/dashboard/locations/new" className={buttonVariants()}>
            Add Location
          </Link>
        </RoleGate>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            {locations?.length ?? 0} active location
            {locations?.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load locations. Please try again.
            </p>
          ) : !locations || locations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-muted-foreground">
                No locations yet. Add your first location to get started.
              </p>
              <RoleGate
                allow={["admin", "manager"]}
                role={profile.role as UserRoleEnum}
              >
                <Link
                  href="/dashboard/locations/new"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Add Location
                </Link>
              </RoleGate>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {loc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/locations/${loc.id}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
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
