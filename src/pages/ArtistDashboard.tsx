import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Music, Image, Video, LogOut, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import CommunityOverview from "@/components/dashboard/CommunityOverview";
import ThemeCustomization from "@/components/dashboard/ThemeCustomization";
import SubscriptionSettings from "@/components/dashboard/SubscriptionSettings";
import PostManagement from "@/components/dashboard/PostManagement";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VerificationUpload } from "@/components/auth/VerificationUpload";


const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [isArtist, setIsArtist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "approved" | "denied" | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/");
        return;
      }

      setUser(session.user);

      // Check if user is an artist
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        toast({
          title: "Error",
          description: "Failed to fetch user role.",
          variant: "destructive"
        });
        return;
      }

      if (roleData?.role !== "artist") {
        console.log("User is not an artist:", roleData);
        toast({
          title: "Access Denied",
          description: "Only artists can access this page",
          variant: "destructive",
        });
        navigate("/home");
        return;
      }

      setIsArtist(true);

      // Get username from artist_usernames table
      const { data: artistData, error: artistError } = await supabase
        .from("artist_usernames")
        .select("username, verified")
        .eq("artist_id", session.user.id)
        .maybeSingle();

      if (artistError) {
        console.error("Error fetching artist data:", artistError);
      }

      if (artistData) {
        setUsername(artistData.username);
        if (artistData.verified) {
          setVerificationStatus("approved");
        } else {
          // Check verifications table for status
          const { data: verifData } = await supabase
            .from("verifications")
            .select("status")
            .eq("artist_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setVerificationStatus(verifData?.status as any || "pending");
        }
      } else {
        // Fallback or unverified state
        setVerificationStatus("pending");
      }
    } catch (error) {
      console.error("Dashboard auth check error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isArtist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Music className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Artist Dashboard</h1>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">



        {/* Verification Banners */}
        {verificationStatus === "pending" && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-1" />
              <div>
                <AlertTitle>Verification Pending</AlertTitle>
                <AlertDescription>
                  Your account is currently under review. Your profile will not be visible to fans until verified.
                </AlertDescription>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 whitespace-nowrap">
                  Verify Now
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md p-0 border-none bg-transparent shadow-none">
                <VerificationUpload
                  userId={user?.id}
                  artistName={username}
                  email={user?.email || ""}
                />
              </DialogContent>
            </Dialog>
          </Alert>
        )}

        {verificationStatus === "denied" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Verification Denied</AlertTitle>
            <AlertDescription>
              Your verification request was denied. Please contact support for more information.
            </AlertDescription>
          </Alert>
        )}

        {verificationStatus === "approved" && (
          <Alert className="border-green-500/50 bg-green-500/10 text-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Verified Artist</AlertTitle>
            <AlertDescription>
              Your account is verified and visible to fans.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Community</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CommunityOverview userId={user?.id} />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeCustomization userId={user?.id} />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionSettings userId={user?.id} />
          </TabsContent>

          <TabsContent value="posts">
            <PostManagement userId={user?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ArtistDashboard;
