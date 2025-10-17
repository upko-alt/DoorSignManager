import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { StatusHistoryDialog } from "./status-history-dialog";
import { Check, Clock, XCircle, BellOff, RotateCw, Loader2, History } from "lucide-react";
import type { Member } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface MemberStatusCardProps {
  member: Member;
  onUpdateStatus: (memberId: string, status: string, customText?: string) => void;
  isUpdating?: boolean;
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

export function MemberStatusCard({ member, onUpdateStatus, isUpdating }: MemberStatusCardProps) {
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const predefinedStatuses = [
    "Available",
    "In Meeting",
    "Out",
    "Do Not Disturb",
    "Be Right Back",
  ] as const;

  return (
    <Card className="hover-elevate transition-shadow duration-200" data-testid={`card-member-${member.id}`}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
        <Avatar className="h-12 w-12" data-testid={`avatar-${member.id}`}>
          <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium truncate" data-testid={`text-member-name-${member.id}`}>
            {member.name}
          </h3>
          {member.email && (
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>{member.email}</p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={member.currentStatus} />
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

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {predefinedStatuses.map((status) => {
              const Icon = STATUS_ICONS[status];
              const isActive = member.currentStatus === status;
              
              return (
                <Button
                  key={status}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusClick(status)}
                  disabled={isUpdating}
                  className="justify-start gap-2"
                  data-testid={`button-status-${status.toLowerCase().replace(/\s+/g, "-")}-${member.id}`}
                  style={
                    isActive
                      ? {
                          backgroundColor: STATUS_COLORS[status],
                          borderColor: STATUS_COLORS[status],
                          color: "white",
                        }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{status}</span>
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
      </CardContent>
      
      <StatusHistoryDialog 
        member={member} 
        open={showHistory} 
        onOpenChange={setShowHistory} 
      />
    </Card>
  );
}
