import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Music, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { checkSubscription } from "@/lib/subscriptionUtils";

interface Artist {
  id: string;
  username: string;
  verified: boolean;
  bio: string | null;
  profile_pic_url: string | null;
}

interface Community {
  id: string;
  name: string;
  description: string | null;
  subscription_price: number;
}

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [subscribedCommunityId, setSubscribedCommunityId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        fetchArtistDetails();
      }
    });
  }, [id, navigate]);

  const fetchArtistDetails = async () => {
    if (!id) return;

    setLoading(true);

    // Fetch artist profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, bio, profile_pic_url")
      .eq("id", id)
      .single();

    // Fetch artist username and verification status
    const { data: artistData } = await supabase
      .from("artist_usernames")
      .select("username, verified")
      .eq("artist_id", id)
      .single();

    if (profile && artistData) {
      setArtist({
        id: profile.id,
        username: artistData.username,
        verified: artistData.verified,
        bio: profile.bio,
        profile_pic_url: profile.profile_pic_url
      });

      // Fetch artist's community
      const { data: communityData } = await supabase
        .from("communities")
        .select("id, name, description, subscription_price")
        .eq("artist_id", id)
        .single();

      if (communityData) {
        setCommunity(communityData);
      }

      // Check if user is already subscribed
      const subCheck = await checkSubscription(id);
      setAlreadySubscribed(subCheck.isSubscribed);
      setSubscribedCommunityId(subCheck.communityId);
      console.log("Subscription check:", subCheck);
    }

    setLoading(false);
  };

  const handleSubscribe = async () => {
    if (!user || !community || !artist) return;

    setIsSubscribing(true);

    try {
      // Call Supabase Edge Function to initialize Paystack transaction
      console.log("Invoking initialize-paystack with:", { artist_id: artist.id, community_id: community.id });
      // DEBUG: Direct fetch to see raw error body
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://osopyusvwsldsfshqoiv.supabase.co/functions/v1/initialize-paystack', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artist_id: artist.id,
          community_id: community.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Raw Edge Function Error:", data);
        throw new Error(data.error || data.message || "Edge Function Failed");
      }

      if (!data?.authorization_url) {
        console.error("Missing auth URL in response:", data);
        throw new Error("No authorization URL returned");
      } else {
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]"
        />
      </div>
    );
  }

  if (!artist || !community) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Artist not found</p>
          <Button onClick={() => navigate("/home")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="border-b border-primary/20 bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Artist Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center space-y-6"
          >
            {/* Large Circular Profile Picture with purple glow */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/40 to-primary border-4 border-primary/60 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.5)] overflow-hidden">
                {artist.profile_pic_url ? (
                  <img
                    src={artist.profile_pic_url}
                    alt={artist.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-20 h-20 text-white" />
                )}
              </div>
              {artist.verified && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="absolute bottom-2 right-2 bg-primary rounded-full p-2 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                >
                  <CheckCircle className="w-6 h-6 text-primary-foreground" />
                </motion.div>
              )}
            </motion.div>

            {/* Artist Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center space-y-4"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-bold border-b-2 border-primary inline-block pb-2">
                  {artist.username}
                </h1>
                {artist.verified && (
                  <p className="text-sm text-primary font-medium">Verified Artist</p>
                )}
              </div>

              {artist.bio && (
                <p className="text-lg text-muted-foreground max-w-xl">
                  {artist.bio}
                </p>
              )}
            </motion.div>

            {/* Community Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              className="w-full bg-gradient-to-br from-primary/15 to-card border border-primary/30 rounded-lg p-6 space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">{community.name}</h2>
                {community.description && (
                  <p className="text-muted-foreground">{community.description}</p>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">${community.subscription_price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              {alreadySubscribed && subscribedCommunityId ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={() => navigate(`/community/${subscribedCommunityId}`)}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300"
                  >
                    Already Joined — Enter Community
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-300"
                  >
                    {isSubscribing ? "Processing..." : "Subscribe to Enter"}
                  </Button>
                </motion.div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {alreadySubscribed
                  ? "You have access to exclusive content, community rooms, and direct artist interactions"
                  : "Get access to exclusive content, community rooms, and direct artist interactions"
                }
              </p>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
};

export default ArtistDetail;
