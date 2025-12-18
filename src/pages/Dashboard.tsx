import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, LogOut, CheckCircle2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, verified")
      .eq("id", userId)
      .single();
    
    if (data) {
      setUsername(data.username);
      setVerified(data.verified);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // AuthWrapper will handle redirect to landing
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-background border border-border rounded-full p-2">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Backstage</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@{username}</span>
              {verified && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Artist Dashboard</h2>
            <p className="text-xl text-muted-foreground">
              Manage your community and content
            </p>
          </div>

          {!verified && (
            <div className="bg-accent/10 border border-accent rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Verification Pending</h3>
              <p className="text-muted-foreground">
                Your artist account is under review. You'll receive a verification badge once approved.
              </p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Create Community</h3>
              <p className="text-muted-foreground mb-4">
                Set up your private subscription-based community for your fans
              </p>
              <Button disabled className="w-full">Coming Soon</Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Manage Content</h3>
              <p className="text-muted-foreground mb-4">
                Create and organize themed rooms for your community
              </p>
              <Button disabled className="w-full">Coming Soon</Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Subscribers</h3>
              <p className="text-muted-foreground mb-4">
                View and manage your community members
              </p>
              <Button disabled className="w-full">Coming Soon</Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Analytics</h3>
              <p className="text-muted-foreground mb-4">
                Track engagement and growth metrics
              </p>
              <Button disabled className="w-full">Coming Soon</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
