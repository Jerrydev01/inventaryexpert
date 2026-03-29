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
import { useRouter } from "next/navigation";
import * as React from "react";

interface LocationOption {
  id: string;
  name: string;
}

interface LocationFormProps {
  action: (
    formData: FormData,
  ) => Promise<{ success: true } | { error: string; code?: string }>;
  parentLocations?: LocationOption[];
  defaultValues?: {
    name?: string;
    type?: string;
    parent_id?: string | null;
  };
  submitLabel?: string;
}

export function LocationForm({
  action,
  parentLocations = [],
  defaultValues,
  submitLabel = "Save Location",
}: LocationFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [locType, setLocType] = React.useState<string>(
    defaultValues?.type ?? "warehouse",
  );
  const [parentId, setParentId] = React.useState<string>(
    defaultValues?.parent_id ?? "none",
  );

  const typeLabels: Record<string, string> = {
    warehouse: "Warehouse",
    store: "Store",
    site: "Site",
    other: "Other",
    vehicle: "Vehicle",
  };
  const parentLabel =
    parentId === "none"
      ? "None (top-level)"
      : (parentLocations.find((l) => l.id === parentId)?.name ??
        "None (top-level)");

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
      showToast.success(
        "Location saved",
        "The location has been saved successfully.",
      );
      router.push("/dashboard/locations");
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
              placeholder="e.g. Main Warehouse"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Location Type *</Label>
            <Select
              name="type"
              defaultValue={defaultValues?.type ?? "warehouse"}
              onValueChange={(v) => setLocType(v ?? "warehouse")}
            >
              <SelectTrigger id="type">
                <SelectValue>{typeLabels[locType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="store">Store</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {parentLocations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent_id">Parent Location</Label>
              <Select
                name="parent_id"
                defaultValue={defaultValues?.parent_id ?? "none"}
                onValueChange={(v) => setParentId(v ?? "none")}
              >
                <SelectTrigger id="parent_id">
                  <SelectValue placeholder="None (top-level)">
                    {parentLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {parentLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
