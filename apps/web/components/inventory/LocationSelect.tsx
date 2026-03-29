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

export interface LocationOption {
  id: string;
  name: string;
  type: string;
}

export function LocationSelect({
  locations,
  name = "locationId",
  defaultValue,
  label,
  placeholder,
  required,
  onChange,
}: {
  locations: LocationOption[];
  name?: string;
  defaultValue?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string | null) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string>(
    defaultValue ?? "",
  );
  const selected = locations.find((l) => l.id === selectedId);

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
          <SelectValue placeholder={placeholder ?? "Select a location…"}>
            {selected ? `${selected.name} (${selected.type})` : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
              <span className="ml-1 text-xs text-muted-foreground capitalize">
                ({loc.type})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
