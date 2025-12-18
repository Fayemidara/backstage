import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Music, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EchoModal } from "@/components/echo/EchoModal";

const Lineup = () => {
  const navigate = useNavigate();
  const { unreadCounts } = useUnreadCounts();
  const [echoModalOpen, setEchoModalOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<{ id: string; name: string; subscriptionId: string } | null>(null);

  console.log("🎵 [Lineup] Unread counts for all communities:", unreadCounts);

  // Fetch user's subscribed artists with proper join to profiles table
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      // 1) Get current user and log for debugging
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      console.log("Lineup: User ID:", uid);

      if (!uid) {
        console.log("Lineup: No user found");
        return [];
      }

      // 2) Base subscriptions query (no joins) + logs
      console.log("Lineup: Query filters =>", { user_id: uid, status: "active" });
      const { data: subsData, error: subsError } = await supabase
        .from("subscriptions")
        .select("id, artist_id, community_id, status, created_at, last_echo_generated")
        .eq("user_id", uid)
        .eq("status", "active");

      if (subsError) {
        console.error("Lineup fetch error (subscriptions):", subsError);
        throw subsError;
      }

      console.log("Lineup: Fetched subs:", subsData);

      if (!subsData || subsData.length === 0) {
        return [];
      }

      // 3) Fetch related profiles (artists) and communities in batch to avoid join issues
      const artistIds = [...new Set(subsData.map((s: any) => s.artist_id).filter(Boolean))];
      const communityIds = [...new Set(subsData.map((s: any) => s.community_id).filter(Boolean))];

      const [profilesRes, communitiesRes, artistUsernamesRes] = await Promise.all([
        artistIds.length
          ? supabase.from("profiles").select("id, bio, profile_pic_url").in("id", artistIds)
          : Promise.resolve({ data: [], error: null } as any),
        communityIds.length
          ? supabase.from("communities").select("id, name").in("id", communityIds)
          : Promise.resolve({ data: [], error: null } as any),
        artistIds.length
          ? supabase.from("artist_usernames").select("artist_id, username, verified").in("artist_id", artistIds)
          : Promise.resolve({ data: [], error: null } as any),
      ] as const);

      if (profilesRes.error) throw profilesRes.error;
      if (communitiesRes.error) throw communitiesRes.error;

      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const communitiesMap = new Map((communitiesRes.data || []).map((c: any) => [c.id, c]));
      const usernamesMap = new Map((artistUsernamesRes.data || []).map((u: any) => [u.artist_id, u]));

      // 4) Merge related data into subscription records
      const merged = subsData.map((sub: any) => {
        const profile = profilesMap.get(sub.artist_id) as any;
        const usernameData = usernamesMap.get(sub.artist_id) as any;

        return {
          ...sub,
          artist: {
            ...profile,
            username: usernameData?.username || "Unknown Artist", // Use verified name
            verified: usernameData?.verified || false
          },
          community: communitiesMap.get(sub.community_id) || null,
        };
      });

      console.log("Lineup: Merged data:", merged);
      return merged;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-20"
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2 border-b-2 border-primary inline-block pb-1">
            Your Lineup
          </h1>
          <p className="text-muted-foreground mt-4">
            {subscriptions?.length
              ? "Artists you're backstage with"
              : "Start building your lineup by subscribing to artists"}
          </p>
        </motion.div>

        {/* Subscriptions Grid */}
        {subscriptions && subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subscriptions.map((sub: any, index: number) => {
              const artist = sub.artist;
              const unreadCount = unreadCounts[sub.community_id]?.total || 0;

              const canGenerateEcho = false;

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="group bg-gradient-to-br from-primary/25 to-black/80 rounded-lg p-6 border border-primary/20 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300 relative"
                >
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute top-4 right-4 h-6 min-w-[24px] px-2 flex items-center justify-center text-xs bg-teal-500 hover:bg-teal-500 border-0"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                  <div
                    onClick={() => navigate(`/community/${sub.community.id}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar with purple glow */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/50 to-primary border-2 border-primary/60 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300 flex items-center justify-center">
                          {artist.profile_pic_url ? (
                            <img
                              src={artist.profile_pic_url}
                              alt={artist.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-8 h-8 text-white" />
                          )}
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-[0_0_12px_rgba(168,85,247,0.8)] animate-pulse" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors duration-300">
                          {artist.username || "Artist"}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {artist.bio || "No bio available"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <TrendingUp className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                          <span className="font-medium">Enter Community</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Your Echo Button - Only show if 29 days have passed */}
                  {canGenerateEcho && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtist({ id: sub.community_id, name: artist.username || "Artist", subscriptionId: sub.id });
                        setEchoModalOpen(true);
                      }}
                      className="mt-4 w-full bg-gradient-to-r from-primary to-pink-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-300"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Your Echo
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <Music className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No artists in your lineup yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Discover artists and get exclusive access to their backstage
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/home")}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg font-medium hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-300"
            >
              Discover Artists
            </motion.button>
          </motion.div>
        )}
      </div>

      {selectedArtist && (
        <EchoModal
          open={echoModalOpen}
          onOpenChange={setEchoModalOpen}
          communityId={selectedArtist.id}
          artistName={selectedArtist.name}
          subscriptionId={selectedArtist.subscriptionId}
        />
      )}
    </motion.div>
  );
};

export default Lineup;
