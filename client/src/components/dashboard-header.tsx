import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface DashboardHeaderProps {
  totalMembers: number;
  availableCount: number;
  lastSync: Date | null;
  isSyncing: boolean;
  syncError?: string;
  onRefresh: () => void;
}

export function DashboardHeader({
  totalMembers,
  availableCount,
  lastSync,
  isSyncing,
  syncError,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-dashboard-title">
            Door Sign Dashboard
          </h1>
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span data-testid="text-total-members">{totalMembers} members</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1.5" data-testid="text-available-count">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-available))]" />
              {availableCount} available
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSync && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              {syncError ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Sync error</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-available))]" />
                  <span data-testid="text-last-sync">
                    Synced {formatDistanceToNow(lastSync, { addSuffix: true })}
                  </span>
                </>
              )}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isSyncing}
            data-testid="button-refresh"
            aria-label="Refresh status"
          >
            <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
          </Button>
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
