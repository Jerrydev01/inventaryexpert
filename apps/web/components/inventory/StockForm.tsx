"use client";

import { showToast } from "@/components/CutomToast";
import { ItemSelect, type ItemOption } from "@/components/inventory/ItemSelect";
import {
  LocationSelect,
  type LocationOption,
} from "@/components/inventory/LocationSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import * as React from "react";

export type { ItemOption, LocationOption };

type StockResult =
  | { success: true; transactionId: string }
  | { error: string; code?: string };

interface StockFormProps {
  title: string;
  description?: string;
  items: ItemOption[];
  locations: LocationOption[];
  /** Which location fields to show */
  mode: "in" | "out" | "transfer" | "return" | "adjust";
  action: (formData: FormData) => Promise<StockResult>;
  defaultItemId?: string;
  defaultFromLocationId?: string;
  defaultToLocationId?: string;
  defaultLocationId?: string;
}

export function StockForm({
  title,
  description,
  items,
  locations,
  mode,
  action,
  defaultItemId,
  defaultFromLocationId,
  defaultToLocationId,
  defaultLocationId,
}: StockFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await action(formData);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      showToast.error("Operation failed", result.error);
    } else {
      showToast.success(
        "Stock updated",
        "The stock operation was recorded successfully.",
      );
      router.push(`/dashboard/transactions/${result.transactionId}`);
      router.refresh();
    }
  }

  const showFrom = mode === "out" || mode === "transfer" || mode === "return";
  const showTo = mode === "in" || mode === "transfer" || mode === "return";
  const showSingleLocation = mode === "adjust";
  const quantityLabel = mode === "adjust" ? "New Total Quantity" : "Quantity";
  const quantityName = mode === "adjust" ? "newQuantity" : "quantity";

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ItemSelect
            items={items}
            name="itemId"
            label="Item *"
            required
            defaultValue={defaultItemId}
          />

          {showFrom && (
            <LocationSelect
              locations={locations}
              name="fromLocationId"
              label="From Location *"
              required
              defaultValue={defaultFromLocationId}
            />
          )}

          {showTo && (
            <LocationSelect
              locations={locations}
              name="toLocationId"
              label="To Location *"
              required
              defaultValue={defaultToLocationId}
            />
          )}

          {showSingleLocation && (
            <LocationSelect
              locations={locations}
              name="locationId"
              label="Location *"
              required
              defaultValue={defaultLocationId}
            />
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={quantityName}>{quantityLabel} *</Label>
            <Input
              id={quantityName}
              name={quantityName}
              type="number"
              min={mode === "adjust" ? "0" : "1"}
              step="1"
              required
              placeholder={mode === "adjust" ? "e.g. 50" : "e.g. 10"}
            />
          </div>

          {mode === "adjust" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                name="reason"
                required
                placeholder="e.g. Physical count correction"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              rows={2}
              placeholder="Optional note or reference…"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Processing…" : title}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
