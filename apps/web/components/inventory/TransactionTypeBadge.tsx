import { Badge } from "@/components/ui/badge";
import type { TransactionTypeEnum } from "@inventaryexpert/types";

const config: Record<
  TransactionTypeEnum,
  { label: string; className: string }
> = {
  stock_in: {
    label: "Stock In",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  stock_out: {
    label: "Stock Out",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  transfer: {
    label: "Transfer",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  return: {
    label: "Return",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  adjustment: {
    label: "Adjustment",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function TransactionTypeBadge({ type }: { type: TransactionTypeEnum }) {
  const { label, className } = config[type] ?? {
    label: type,
    className: "",
  };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
