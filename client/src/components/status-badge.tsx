import { Check, Clock, XCircle, BellOff, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const upperStatus = status.trim();
    
    switch (upperStatus) {
      case "Available":
        return {
          icon: Check,
          color: "hsl(var(--status-available))",
          label: "Available",
        };
      case "In Meeting":
        return {
          icon: Clock,
          color: "hsl(var(--status-meeting))",
          label: "In Meeting",
        };
      case "Out":
        return {
          icon: XCircle,
          color: "hsl(var(--status-out))",
          label: "Out",
        };
      case "Do Not Disturb":
        return {
          icon: BellOff,
          color: "hsl(var(--status-dnd))",
          label: "Do Not Disturb",
        };
      case "Be Right Back":
        return {
          icon: RotateCw,
          color: "hsl(var(--status-brb))",
          label: "Be Right Back",
        };
      default:
        return {
          icon: Check,
          color: "hsl(var(--muted))",
          label: status,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      className={`gap-1.5 ${className}`}
      style={{
        backgroundColor: config.color,
        color: "white",
      }}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-sm font-medium">{config.label}</span>
    </Badge>
  );
}
