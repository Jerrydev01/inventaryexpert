"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as React from "react";

export interface ItemOption {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
}

export function ItemSelect({
  items,
  name = "itemId",
  defaultValue,
  label,
  required,
  onChange,
}: {
  items: ItemOption[];
  name?: string;
  defaultValue?: string;
  label?: string;
  required?: boolean;
  onChange?: (value: string | null) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string>(
    defaultValue ?? "",
  );
  const selected = items.find((i) => i.id === selectedId);

  function handleChange(value: string | null) {
    setSelectedId(value ?? "");
    onChange?.(value);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={name}>{label}</Label>}
      <Select
        name={name}
        defaultValue={defaultValue}
        required={required}
        onValueChange={handleChange}
      >
        <SelectTrigger id={name} className="w-full">
          <SelectValue placeholder="Select an item…">
            {selected
              ? `${selected.name}${selected.sku ? ` (${selected.sku})` : ""}`
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
              {item.sku ? (
                <span className="ml-1 text-muted-foreground">({item.sku})</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
