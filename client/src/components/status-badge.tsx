import { Check, Clock, XCircle, BellOff, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StatusOption } from "@shared/schema";

interface StatusBadgeProps {
  status: string;
  statusOptions?: StatusOption[];
  className?: string;
}

export function StatusBadge({ status, statusOptions = [], className }: StatusBadgeProps) {

  const getStatusIcon = (name: string) => {
    const iconMap: Record<string, any> = {
      "Available": Check,
      "In Meeting": Clock,
      "Out": XCircle,
      "Do Not Disturb": BellOff,
      "Be Right Back": RotateCw,
    };
    return iconMap[name] || Check;
  };

  const getStatusColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: "hsl(var(--status-available))",
      yellow: "hsl(var(--status-meeting))",
      red: "hsl(var(--status-out))",
      blue: "hsl(var(--status-brb))",
      purple: "hsl(220 70% 50%)",
      orange: "hsl(25 95% 53%)",
      gray: "hsl(var(--muted))",
    };
    return colorMap[color] || "hsl(var(--primary))";
  };

  const getStatusConfig = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.name === status.trim());
    
    if (statusOption) {
      return {
        icon: getStatusIcon(statusOption.name),
        color: getStatusColor(statusOption.color),
        label: statusOption.name,
      };
    }
    
    // Fallback for unknown statuses
    return {
      icon: Check,
      color: "hsl(var(--muted))",
      label: status,
    };
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
