"use client";

import { cn } from "@/lib/utils";
import { Input } from "@base-ui/react";
import {
  CancelCircleIcon,
  Close,
  SearchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  className,
  delay = 500,
  isClearable = false,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  delay?: number;
  placeholder?: string;
  isClearable?: boolean;
}) => {
  const [inputValue, setInputValue] = useState(value);

  // Sync internal state if parent value changes externally (e.g. reset)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Only call onChange after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, delay);

    return () => clearTimeout(timer);
  }, [inputValue, delay]);

  return (
    <div className="flex relative gap-2">
      <HugeiconsIcon
        icon={SearchIcon}
        strokeWidth={2}
        className="text-muted-foreground size-4 absolute left-2 top-1/2 -translate-y-1/2"
      />
      <Input
        placeholder={placeholder}
        className={cn(
          "border text-base py-2 rounded-lg placeholder:text-muted-foreground pl-10",
          className,
        )}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {isClearable && inputValue.length > 1 && (
        <HugeiconsIcon
          onClick={() => setInputValue("")}
          icon={CancelCircleIcon}
          strokeWidth={2}
          className="size-5 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer z-50 text-gray-600"
        />
      )}
    </div>
  );
};
