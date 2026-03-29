"use client";

import { showToast } from "@/components/CutomToast";
import { ItemImageInput } from "@/components/inventory/ItemImageInput";
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
import { createClient } from "@/lib/supabase/client";
import {
  buildStoragePath,
  imagePresets,
  optimizeImage,
} from "@inventaryexpert/utils";
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
    image_path?: string | null;
  };
  /** The authenticated user's company ID — required for storage uploads */
  companyId: string;
  /** Present on edit; undefined on create (a new UUID is generated client-side) */
  itemId?: string;
  submitLabel?: string;
}

export function ItemForm({
  action,
  defaultValues,
  companyId,
  itemId,
  submitLabel = "Save Item",
}: ItemFormProps) {
  const router = useRouter();

  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [trackedAsset, setTrackedAsset] = React.useState<string>(
    defaultValues?.is_tracked_asset ? "true" : "false",
  );

  // Image state
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageUploading, setImageUploading] = React.useState(false);

  // Stable item ID: use the existing one on edit, or generate one client-side for create
  const stableItemId = React.useRef(itemId ?? crypto.randomUUID());

  // Clean up the object URL on unmount to avoid memory leaks
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileSelected(file: File | undefined) {
    if (!file) return;
    // Revoke previous preview
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setImageFile(file);
  }

  function clearImage() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setImageFile(null);
  }

  const trackedAssetLabels: Record<string, string> = {
    false: "Stock item (consumable)",
    true: "Tracked asset (individual serial)",
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Always pass the item ID so the server action can set it on insert
    formData.set("item_id", stableItemId.current);

    // If there is a new image, optimize → upload → append path
    if (imageFile) {
      setImageUploading(true);
      try {
        const optimized = await optimizeImage(imageFile, imagePresets.items);
        const storagePath = buildStoragePath(
          "items",
          companyId,
          stableItemId.current,
        );
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("items")
          .upload(storagePath, optimized, {
            contentType: "image/webp",
            upsert: true,
          });
        if (uploadError) {
          setError(`Image upload failed: ${uploadError.message}`);
          showToast.error("Upload failed", uploadError.message);
          setPending(false);
          setImageUploading(false);
          return;
        }
        formData.set("image_path", storagePath);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Image processing failed";
        setError(msg);
        showToast.error("Image error", msg);
        setPending(false);
        setImageUploading(false);
        return;
      }
      setImageUploading(false);
    }

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

  const isBusy = pending || imageUploading;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ── Image upload ── */}
          <div className="flex flex-col gap-2">
            <Label>Item Photo</Label>
            <ItemImageInput
              previewUrl={previewUrl}
              isUploading={imageUploading}
              onFileSelected={(file) => handleFileSelected(file)}
              onClear={clearImage}
            />
          </div>

          {/* ── Text fields ── */}
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
            <Button type="submit" disabled={isBusy}>
              {imageUploading
                ? "Uploading image…"
                : pending
                  ? "Saving…"
                  : submitLabel}
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
