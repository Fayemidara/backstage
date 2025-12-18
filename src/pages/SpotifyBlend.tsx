import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Music2, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

const SpotifyBlend = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isArtist } = useUserRole();
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  // Handle back navigation based on user role
  const handleBack = () => {
    if (isArtist) {
      navigate('/artist/dashboard');
    } else {
      navigate(`/community/${id}`);
    }
  };

  useEffect(() => {
    fetchCommunity();
  }, [id]);

  useEffect(() => {
    if (community?.blend_full_at) {
      const timer = setInterval(() => {
        const now = new Date();
        const fullAt = new Date(community.blend_full_at);
        const hideAt = new Date(fullAt.getTime() + 24 * 60 * 60 * 1000); // 24h after full
        
        if (now >= hideAt) {
          // Hide the room after 24h
          navigate(`/community/${id}`);
        } else if (now < fullAt) {
          setTimeLeft("");
        } else {
          const remaining = hideAt.getTime() - now.getTime();
          const hours = Math.floor(remaining / 3600000);
          const mins = Math.floor((remaining % 3600000) / 60000);
          setTimeLeft(`${hours}h ${mins}m until this disappears`);
        }
      }, 60000); // Update every minute

      return () => clearInterval(timer);
    }
  }, [community, id, navigate]);

  const fetchCommunity = async () => {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching community:", error);
      toast({
        title: "Error",
        description: "Failed to load Spotify Blend",
        variant: "destructive",
      });
    } else {
      setCommunity(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const channel = supabase
      .channel(`blend_${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "communities",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setCommunity(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleJoinBlend = () => {
    if (community?.blend_link) {
      window.open(community.blend_link, "_blank");
    }
  };

  const handleShare = () => {
    const shareText = `Join my Spotify Blend on Backstage!`;
    if (navigator.share) {
      navigator.share({
        title: "Spotify Blend",
        text: shareText,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied!",
          description: "Share text copied to clipboard",
        });
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied!",
        description: "Share text copied to clipboard",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!community?.blend_active) {
    navigate(`/community/${id}`);
    return null;
  }

  const isFull = community.blend_full_at && new Date(community.blend_full_at) <= new Date();
  const backgroundStyle = community.wallpaper_url
    ? { backgroundImage: `url(${community.wallpaper_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div
      className="min-h-screen bg-background text-foreground p-4 md:p-8"
      style={backgroundStyle}
    >
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 text-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-6">
          <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Music2 className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Spotify Blend</CardTitle>
              <CardDescription>
                {isFull 
                  ? "This Blend is now full" 
                  : `Join the exclusive Spotify Blend with ${community.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {!isFull ? (
                <>
                  <p className="text-muted-foreground">
                    Click below to join the blend and see how your music taste matches!
                  </p>
                  <Button
                    size="lg"
                    onClick={handleJoinBlend}
                    className="w-full md:w-auto"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Join Blend with {community.name}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="w-full md:w-auto"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Your Match!
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <p className="text-xl font-semibold text-muted-foreground mb-2">
                      Blend Full — Missed Out?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This Blend reached its limit. Stay tuned for the next one!
                    </p>
                    {timeLeft && (
                      <p className="text-xs text-muted-foreground mt-4 opacity-70">
                        {timeLeft}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">What is Spotify Blend?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Spotify Blend creates a shared playlist that combines your music taste with the artist's.
              </p>
              <p>
                You'll get a match percentage showing how similar your tastes are, and a custom playlist
                with songs you both love.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SpotifyBlend;
