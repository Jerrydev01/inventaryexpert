import { Badge } from "@/components/ui/badge";

export function BalanceBadge({
  quantity,
  unit,
}: {
  quantity: number;
  unit: string;
}) {
  const isLow = quantity <= 5;
  const isEmpty = quantity === 0;

  return (
    <Badge
      variant="outline"
      className={
        isEmpty
          ? "bg-red-50 text-red-700 border-red-200"
          : isLow
            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }
    >
      {quantity} {unit}
    </Badge>
  );
}
