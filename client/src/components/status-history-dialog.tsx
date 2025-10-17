import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type User, type StatusHistory, type StatusOption } from "@shared/schema";
import { StatusBadge } from "./status-badge";
import { format } from "date-fns";
import { Clock } from "lucide-react";

interface StatusHistoryDialogProps {
  member: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusOptions: StatusOption[];
}

export function StatusHistoryDialog({ member, open, onOpenChange, statusOptions }: StatusHistoryDialogProps) {
  const { data: history, isLoading } = useQuery<StatusHistory[]>({
    queryKey: ["/api/members", member.id, "history"],
    enabled: open,
  });

  const getFullName = (firstName: string | null, lastName: string | null) => {
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.join(" ") || "Unknown User";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-status-history">
        <DialogHeader>
          <DialogTitle data-testid="text-history-title">Status History - {getFullName(member.firstName, member.lastName)}</DialogTitle>
          <DialogDescription data-testid="text-history-description">
            View all status changes for this member
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-history">
              <div className="text-sm text-muted-foreground">Loading history...</div>
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div 
                  key={entry.id} 
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover-elevate"
                  data-testid={`history-entry-${index}`}
                >
                  <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} statusOptions={statusOptions} className="scale-90" />
                      <span className="text-xs text-muted-foreground" data-testid={`text-history-time-${index}`}>
                        {format(new Date(entry.changedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    {entry.customStatusText && (
                      <p className="text-sm" data-testid={`text-history-custom-${index}`}>
                        {entry.customStatusText}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8" data-testid="text-no-history">
              <div className="text-sm text-muted-foreground">No status history available</div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
