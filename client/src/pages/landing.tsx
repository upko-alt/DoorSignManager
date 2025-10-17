import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, Shield, Clock, History } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <DoorOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-landing-title">
            E-Paper Door Sign Management
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-landing-description">
            Manage department member availability statuses and sync with physical e-paper door signs in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="card-feature-status">
            <CardHeader>
              <DoorOpen className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Real-Time Status Updates</CardTitle>
              <CardDescription>
                Update member availability status with predefined options or custom messages
              </CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="card-feature-history">
            <CardHeader>
              <History className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Activity Tracking</CardTitle>
              <CardDescription>
                Complete history of all status changes with timestamps and detailed logs
              </CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="card-feature-sync">
            <CardHeader>
              <Clock className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">E-Paper Sync</CardTitle>
              <CardDescription>
                Automatic synchronization with physical e-paper displays mounted on office doors
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-2 border-primary/20" data-testid="card-login">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Secure Access Required</CardTitle>
            <CardDescription className="text-base">
              This dashboard requires authentication to protect department member information
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="px-8"
              data-testid="button-login"
            >
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground" data-testid="text-footer">
          Department members and administrators can access the dashboard to manage door sign statuses
        </p>
      </div>
    </div>
  );
}
