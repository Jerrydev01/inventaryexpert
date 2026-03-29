import { TransactionTypeBadge } from "@/components/inventory/TransactionTypeBadge";
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
import type { TransactionTypeEnum } from "@inventaryexpert/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; locationId?: string }>;
}) {
  const { itemId, locationId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  let query = supabase
    .from("stock_transactions")
    .select(
      "id, transaction_type, quantity, notes, created_at, item_id, items(name, unit)",
    )
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (itemId) query = query.eq("item_id", itemId);
  if (locationId)
    query = query.or(
      `from_location_id.eq.${locationId},to_location_id.eq.${locationId}`,
    );

  const { data: transactions, error } = await query;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Transaction History
        </h1>
        <p className="text-sm text-muted-foreground">
          Immutable record of all stock movements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {transactions?.length ?? 0} record
            {transactions?.length !== 1 ? "s" : ""}
            {itemId ? " for this item" : ""}
            {locationId ? " for this location" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load transactions.
            </p>
          ) : !transactions || transactions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No transactions recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const item = tx.items as {
                    name: string;
                    unit: string;
                  } | null;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <TransactionTypeBadge
                          type={tx.transaction_type as TransactionTypeEnum}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/items/${tx.item_id}`}
                          className="hover:underline"
                        >
                          {item?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tx.quantity} {item?.unit ?? ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {tx.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/transactions/${tx.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          View
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
