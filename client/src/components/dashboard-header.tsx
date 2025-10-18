import { RefreshCw, CheckCircle2, AlertCircle, LogOut, Shield, Users, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface DashboardHeaderProps {
  totalMembers: number;
  lastSync: Date | null;
  isSyncing: boolean;
  syncError?: string;
  onRefresh: () => void;
}

export function DashboardHeader({
  totalMembers,
  lastSync,
  isSyncing,
  syncError,
  onRefresh,
}: DashboardHeaderProps) {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.username?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-dashboard-title">
            Door Sign Dashboard
          </h1>
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span data-testid="text-total-members">{totalMembers} members</span>
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

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none" data-testid="text-user-name">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                    </p>
                    {user.email && (
                      <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs">Role:</span>
                    <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs" data-testid="badge-user-role">
                      {isAdmin ? "Admin" : "Regular"}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setLocation("/admin/users")} data-testid="button-manage-users">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Manage Users</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/admin/status-options")} data-testid="button-manage-status-options">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Manage Status Options</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
