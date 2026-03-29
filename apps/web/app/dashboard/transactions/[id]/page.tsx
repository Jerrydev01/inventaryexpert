import { TransactionTypeBadge } from "@/components/inventory/TransactionTypeBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { TransactionTypeEnum } from "@inventaryexpert/types";

export default async function TransactionDetailPage({
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
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: tx } = await supabase
    .from("stock_transactions")
    .select(
      `id, transaction_type, quantity, notes, created_at, performed_by,
       item_id, from_location_id, to_location_id,
       items(name, unit, sku),
       from_location:locations!from_location_id(name, type),
       to_location:locations!to_location_id(name, type),
       performer:profiles!performed_by(id)`,
    )
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!tx) notFound();

  const item = tx.items as {
    name: string;
    unit: string;
    sku: string | null;
  } | null;
  const fromLoc = tx.from_location as { name: string; type: string } | null;
  const toLoc = tx.to_location as { name: string; type: string } | null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Transaction</h1>
            <TransactionTypeBadge
              type={tx.transaction_type as TransactionTypeEnum}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(tx.created_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Link
          href="/dashboard/transactions"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          All Transactions
        </Link>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Transaction ID: {tx.id}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DetailRow
            label="Item"
            value={
              <Link
                href={`/dashboard/items/${tx.item_id}`}
                className="hover:underline font-medium"
              >
                {item?.name ?? "—"}
                {item?.sku ? (
                  <span className="ml-1 text-sm text-muted-foreground font-normal">
                    ({item.sku})
                  </span>
                ) : null}
              </Link>
            }
          />
          <Separator />
          <DetailRow
            label="Quantity"
            value={
              <span className="tabular-nums font-medium">
                {tx.quantity} {item?.unit ?? ""}
              </span>
            }
          />
          {fromLoc && (
            <>
              <Separator />
              <DetailRow
                label="From"
                value={
                  <span className="capitalize">
                    {fromLoc.name}{" "}
                    <span className="text-muted-foreground text-sm">
                      ({fromLoc.type})
                    </span>
                  </span>
                }
              />
            </>
          )}
          {toLoc && (
            <>
              <Separator />
              <DetailRow
                label="To"
                value={
                  <span className="capitalize">
                    {toLoc.name}{" "}
                    <span className="text-muted-foreground text-sm">
                      ({toLoc.type})
                    </span>
                  </span>
                }
              />
            </>
          )}
          {tx.notes && (
            <>
              <Separator />
              <DetailRow label="Notes" value={tx.notes} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground w-24 shrink-0">
        {label}
      </span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
