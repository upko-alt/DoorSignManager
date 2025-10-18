import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { MemberStatusCard } from "@/components/member-status-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User, UpdateStatus, StatusOption, SyncStatus } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { AlertCircle, Shield } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [updatingMembers, setUpdatingMembers] = useState<Set<string>>(new Set());

  // Fetch members data (now returns users with status fields)
  const { data: members = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/members"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch status options
  const { data: statusOptions = [] } = useQuery<StatusOption[]>({
    queryKey: ["/api/status-options"],
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (update: UpdateStatus) => {
      return apiRequest("POST", "/api/members/status", update);
    },
    onMutate: async (update) => {
      setUpdatingMembers((prev) => new Set(prev).add(update.userId));
      
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/members"] });
      const previousMembers = queryClient.getQueryData<User[]>(["/api/members"]);
      
      queryClient.setQueryData<User[]>(["/api/members"], (old) =>
        old?.map((member) =>
          member.id === update.userId
            ? {
                ...member,
                currentStatus: update.status,
                customStatusText: update.customText || null,
                lastUpdated: new Date(),
              }
            : member
        )
      );
      
      return { previousMembers };
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Door sign status has been updated successfully.",
      });
    },
    onError: (error, update, context) => {
      // Rollback on error
      if (context?.previousMembers) {
        queryClient.setQueryData(["/api/members"], context.previousMembers);
      }
      
      // Handle unauthorized errors
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, update) => {
      setUpdatingMembers((prev) => {
        const next = new Set(prev);
        next.delete(update.userId);
        return next;
      });
      
      // Invalidate member list and member's status history
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", update.userId, "history"] });
    },
  });

  const handleUpdateStatus = (userId: string, status: string, customText?: string) => {
    updateStatusMutation.mutate({
      userId,
      status,
      customText,
    });
  };

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync", {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({
        title: "Sync completed",
        description: "Status data has been synced with e-paper system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    if (isAdmin) {
      syncMutation.mutate();
    } else {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          totalMembers={0}
          lastSync={syncStatus?.syncedAt ? new Date(syncStatus.syncedAt) : null}
          isSyncing={syncMutation.isPending}
          syncError={syncStatus?.success === "false" ? (syncStatus.errorMessage || undefined) : undefined}
          onRefresh={handleRefresh}
        />
        <div className="container px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-destructive" data-testid="card-error">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" data-testid="icon-error" />
              <div>
                <p className="font-medium text-destructive" data-testid="text-error-title">Failed to load dashboard</p>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-error-message">
                  {error instanceof Error ? error.message : "An error occurred while loading members."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        totalMembers={members.length}
        lastSync={syncStatus?.syncedAt ? new Date(syncStatus.syncedAt) : null}
        isSyncing={syncMutation.isPending}
        syncError={syncStatus?.success === "false" ? (syncStatus.errorMessage || undefined) : undefined}
        onRefresh={handleRefresh}
      />
      
      <main className="container px-4 sm:px-6 lg:px-8 py-8">
        {!isAdmin && (
          <Alert className="mb-6" data-testid="alert-readonly">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You have read-only access. Only administrators can update member statuses.
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24" />
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[...Array(6)].map((_, j) => (
                        <Skeleton key={j} className="h-9 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : members.length === 0 ? (
          <Card data-testid="card-empty-state">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" data-testid="icon-empty" />
              </div>
              <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">No department members found</h3>
              <p className="text-sm text-muted-foreground max-w-md" data-testid="text-empty-message">
                Add department members to start managing their door sign statuses.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <MemberStatusCard
                key={member.id}
                member={member}
                onUpdateStatus={handleUpdateStatus}
                isUpdating={updatingMembers.has(member.id)}
                readOnly={!isAdmin}
                statusOptions={statusOptions}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
