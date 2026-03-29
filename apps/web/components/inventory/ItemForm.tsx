"use client";

import { showToast } from "@/components/CutomToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import * as React from "react";

interface ItemFormProps {
  action: (
    formData: FormData,
  ) => Promise<{ success: true } | { error: string; code?: string }>;
  defaultValues?: {
    name?: string;
    sku?: string;
    unit?: string;
    category?: string;
    description?: string;
    is_tracked_asset?: boolean;
  };
  submitLabel?: string;
}

export function ItemForm({
  action,
  defaultValues,
  submitLabel = "Save Item",
}: ItemFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [trackedAsset, setTrackedAsset] = React.useState<string>(
    defaultValues?.is_tracked_asset ? "true" : "false",
  );

  const trackedAssetLabels: Record<string, string> = {
    false: "Stock item (consumable)",
    true: "Tracked asset (individual serial)",
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await action(formData);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      showToast.error("Save failed", result.error);
    } else {
      showToast.success("Item saved", "The item has been saved successfully.");
      router.push("/dashboard/items");
      router.refresh();
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={defaultValues?.name}
              placeholder="e.g. Portland Cement"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                defaultValue={defaultValues?.sku ?? ""}
                placeholder="e.g. CEM-001"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                name="unit"
                required
                defaultValue={defaultValues?.unit ?? "unit"}
                placeholder="e.g. bags, kg, pcs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              defaultValue={defaultValues?.category ?? ""}
              placeholder="e.g. Cement & Binders"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              rows={3}
              placeholder="Optional notes…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="is_tracked_asset">Type</Label>
            <Select
              name="is_tracked_asset"
              defaultValue={defaultValues?.is_tracked_asset ? "true" : "false"}
              onValueChange={(v) => setTrackedAsset(v ?? "false")}
            >
              <SelectTrigger id="is_tracked_asset">
                <SelectValue>{trackedAssetLabels[trackedAsset]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Stock item (consumable)</SelectItem>
                <SelectItem value="true">
                  Tracked asset (individual serial)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
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
