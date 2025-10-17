import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { StatusHistoryDialog } from "./status-history-dialog";
import { Check, Clock, XCircle, BellOff, RotateCw, Loader2, History } from "lucide-react";
import type { User, StatusOption } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface MemberStatusCardProps {
  member: User;
  onUpdateStatus: (userId: string, status: string, customText?: string) => void;
  isUpdating?: boolean;
  readOnly?: boolean;
  statusOptions: StatusOption[];
}

const STATUS_ICONS = {
  "Available": Check,
  "In Meeting": Clock,
  "Out": XCircle,
  "Do Not Disturb": BellOff,
  "Be Right Back": RotateCw,
} as const;

const STATUS_COLORS = {
  "Available": "hsl(var(--status-available))",
  "In Meeting": "hsl(var(--status-meeting))",
  "Out": "hsl(var(--status-out))",
  "Do Not Disturb": "hsl(var(--status-dnd))",
  "Be Right Back": "hsl(var(--status-brb))",
} as const;

export function MemberStatusCard({ member, onUpdateStatus, isUpdating, readOnly = false, statusOptions }: MemberStatusCardProps) {
  const [customText, setCustomText] = useState(member.customStatusText || "");
  const [selectedStatus, setSelectedStatus] = useState<string>(member.currentStatus);
  const [showHistory, setShowHistory] = useState(false);

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    onUpdateStatus(member.id, status, customText || undefined);
  };

  const handleCustomUpdate = () => {
    if (customText.trim()) {
      onUpdateStatus(member.id, selectedStatus, customText.trim());
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const parts = [];
    if (firstName) parts.push(firstName[0]);
    if (lastName) parts.push(lastName[0]);
    return parts.join("").toUpperCase() || "?";
  };

  const getFullName = (firstName: string | null, lastName: string | null) => {
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.join(" ") || "Unknown User";
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

  return (
    <Card className="hover-elevate transition-shadow duration-200" data-testid={`card-member-${member.id}`}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
        <Avatar className="h-12 w-12" data-testid={`avatar-${member.id}`}>
          <AvatarImage src={member.avatarUrl || undefined} alt={getFullName(member.firstName, member.lastName)} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(member.firstName, member.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium truncate" data-testid={`text-member-name-${member.id}`}>
            {getFullName(member.firstName, member.lastName)}
          </h3>
          {member.email && (
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>{member.email}</p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={member.currentStatus} statusOptions={statusOptions} />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(true)}
              className="h-7 w-7"
              data-testid={`button-view-history-${member.id}`}
            >
              <History className="h-4 w-4" />
            </Button>
            {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" data-testid={`loader-updating-${member.id}`} />}
            <span className="text-xs text-muted-foreground" data-testid={`text-last-updated-${member.id}`}>
              {formatDistanceToNow(new Date(member.lastUpdated), { addSuffix: true })}
            </span>
          </div>
        </div>

        {member.customStatusText && member.customStatusText !== member.currentStatus && (
          <p className="text-sm text-muted-foreground italic" data-testid={`text-custom-status-${member.id}`}>
            "{member.customStatusText}"
          </p>
        )}

        {!readOnly && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const Icon = getStatusIcon(option.name);
                const isActive = member.currentStatus === option.name;
                
                return (
                  <Button
                    key={option.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusClick(option.name)}
                    disabled={isUpdating}
                    className="justify-start gap-2"
                    data-testid={`button-status-${option.name.toLowerCase().replace(/\s+/g, "-")}-${member.id}`}
                    style={
                      isActive
                        ? {
                            backgroundColor: getStatusColor(option.color),
                            borderColor: getStatusColor(option.color),
                            color: "white",
                          }
                        : undefined
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{option.name}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Custom status message..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, 50))}
                maxLength={50}
                disabled={isUpdating}
                data-testid={`input-custom-text-${member.id}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCustomUpdate();
                  }
                }}
              />
              <Button
                onClick={handleCustomUpdate}
                disabled={!customText.trim() || isUpdating}
                data-testid={`button-update-custom-text-${member.id}`}
              >
                Update
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right" data-testid={`text-char-count-${member.id}`}>
              {customText.length}/50
            </div>
          </div>
        )}
      </CardContent>
      
      <StatusHistoryDialog 
        member={member} 
        open={showHistory} 
        onOpenChange={setShowHistory}
        statusOptions={statusOptions}
      />
    </Card>
  );
}
