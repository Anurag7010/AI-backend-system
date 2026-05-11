import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-4xl font-bold tracking-tight text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </Card>
  );
}
