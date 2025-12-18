import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, LogOut, Search, MessageCircle, Music2, ShoppingBag, Megaphone, CheckCircle, Library, Ticket, ListMusic } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { checkSubscription } from "@/lib/subscriptionUtils";

interface Artist {
  id: string;
  username: string;
  verified: boolean;
  bio: string | null;
}

interface Community {
  id: string;
  artist_id: string;
  name: string;
  description: string | null;
  blend_active?: boolean;
  blend_link?: string | null;
  blend_full_at?: string | null;
}

interface ArtistWithCommunity extends Artist {
  community: Community;
}

interface Subscription {
  community_id: string;
  artist_id: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscribedArtists, setSubscribedArtists] = useState<ArtistWithCommunity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<ArtistWithCommunity | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setTimeout(() => navigate("/"), 0);
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Use React Query for profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("username, profile_pic_url")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Use React Query for subscriptions
  const { data: subscriptionsData } = useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("subscriptions")
        .select("community_id, artist_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Handle artist card clicks with subscription check
  const handleArtistClick = async (artistId: string) => {
    console.log("Artist clicked:", artistId);

    // Check subscription status using utility
    const { isSubscribed, communityId } = await checkSubscription(artistId);
    console.log("Subscription status:", { isSubscribed, communityId });

    if (isSubscribed && communityId) {
      // User is already subscribed, redirect to community
      navigate(`/community/${communityId}`);
    } else {
      // User is not subscribed, go to artist detail/subscribe page
      navigate(`/artist/${artistId}`);
    }
  };

  // Use React Query for subscribed artists with communities
  const { data: subscribedArtistsData } = useQuery({
    queryKey: ["subscribedArtists", subscriptionsData],
    queryFn: async () => {
      if (!subscriptionsData || subscriptionsData.length === 0) return [];

      const { data: communities } = await supabase
        .from("communities")
        .select("id, artist_id, name, description, blend_active, blend_link, blend_full_at")
        .in("id", subscriptionsData.map(s => s.community_id));

      if (!communities) return [];

      const artistIds = communities.map(c => c.artist_id);

      // Fetch profiles AND artist_usernames
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, bio, profile_pic_url")
        .in("id", artistIds);

      const { data: artistUsernames } = await supabase
        .from("artist_usernames")
        .select("artist_id, username, verified")
        .in("artist_id", artistIds);

      if (!profiles) return [];

      return profiles.map(profile => {
        const community = communities.find(c => c.artist_id === profile.id)!;
        const artistUsername = artistUsernames?.find(au => au.artist_id === profile.id);

        return {
          ...profile,
          username: artistUsername?.username || "Unknown Artist", // Use verified username
          verified: artistUsername?.verified || false,
          community
        };
      });
    },
    enabled: !!subscriptionsData && subscriptionsData.length > 0,
  });

  // Update local state when queries complete
  useEffect(() => {
    if (profile) setUsername(profile.username);
  }, [profile]);

  useEffect(() => {
    if (subscriptionsData) setSubscriptions(subscriptionsData);
  }, [subscriptionsData]);

  useEffect(() => {
    if (subscribedArtistsData) setSubscribedArtists(subscribedArtistsData);
  }, [subscribedArtistsData]);

  const searchArtists = async (query: string) => {
    if (!query.trim()) {
      setArtists([]);
      return;
    }

    setIsSearching(true);

    try {
      // 1. Search artist_usernames
      let queryBuilder = supabase
        .from("artist_usernames")
        .select("artist_id, username, verified")
        .eq("verified", true)
        .ilike("username", `%${query}%`); // Always filter by query

      const { data: artistsData, error: artistsError } = await queryBuilder;

      if (artistsError) throw artistsError;

      if (!artistsData || artistsData.length === 0) {
        setArtists([]);
        setIsSearching(false);
        return;
      }

      // 2. Fetch profiles for these artists
      const artistIds = artistsData.map(a => a.artist_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, bio, profile_pic_url")
        .in("id", artistIds);

      if (profilesError) throw profilesError;

      // 3. Merge
      const formattedArtists = artistsData.map(artist => {
        const profile = profilesData?.find(p => p.id === artist.artist_id);
        return {
          id: artist.artist_id,
          username: artist.username,
          verified: artist.verified,
          bio: profile?.bio || null,
          profile_pic_url: profile?.profile_pic_url || null
        };
      });

      setArtists(formattedArtists);
    } catch (error) {
      console.error("Error searching artists:", error);
      toast({ title: "Error", description: "Failed to search artists", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchArtists(searchQuery);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const baseRooms = [
    { name: "Lounge", icon: MessageCircle, description: "Chat with the community", type: "lounge" },
    { name: "Music Drop", icon: Music2, description: "Exclusive music releases", type: "music-drop" },
    { name: "Merch Drop", icon: ShoppingBag, description: "Limited edition merchandise", type: "merch-drop" },
    { name: "Announcements", icon: Megaphone, description: "Latest updates from the artist", type: "announcements" },
    { name: "Ticket Drop", icon: Ticket, description: "Exclusive event tickets", type: "ticket-drop" },
  ];

  // Add Spotify Blend if enabled
  const rooms = selectedArtist?.community?.blend_active
    ? [...baseRooms, { name: "Spotify Blend", icon: ListMusic, description: "Join the exclusive playlist", type: "spotify-blend" }]
    : baseRooms;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-20"
    >
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-background border border-border rounded-full p-2">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Backstage</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">@{username}</span>
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
      <main className="container mx-auto px-4">
        {subscribedArtists.length === 0 ? (
          // Discovery View (Unsubscribed)
          <div className="space-y-12">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-background border border-primary/30 mt-8 shadow-[0_0_40px_rgba(168,85,247,0.2)]"
            >
              <div className="relative z-10 px-6 py-16 md:py-24 text-center space-y-6">
                <h2 className="text-5xl md:text-6xl font-bold text-foreground border-b-2 border-primary inline-block pb-2" style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.5)' }}>
                  Where the real ones go
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Join exclusive artist communities and get early access to music, merch, tickets, and more
                </p>

                {/* Music Waveform Animation */}
                <div className="flex items-end justify-center gap-1 h-12 opacity-40">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1.5s'
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for artists to join their backstage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-base border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Discovery Grid */}
            <div className="max-w-6xl mx-auto space-y-6 pb-12">
              {isSearching ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Searching...</p>
                </div>
              ) : artists.length > 0 ? (
                <>
                  <h3 className="text-2xl font-bold text-primary border-b-2 border-primary inline-block pb-1">Search Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {artists.map((artist, index) => (
                      <motion.button
                        key={artist.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          // Check if user is already subscribed to this artist
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const { data: existingSub } = await supabase
                              .from("subscriptions")
                              .select("community_id")
                              .eq("user_id", user.id)
                              .eq("artist_id", artist.id)
                              .eq("status", "active")
                              .maybeSingle();

                            if (existingSub) {
                              // Already subscribed - go directly to community
                              navigate(`/community/${existingSub.community_id}`);
                            } else {
                              // Not subscribed - go to subscribe page
                              navigate(`/artist/${artist.id}`);
                            }
                          } else {
                            navigate(`/artist/${artist.id}`);
                          }
                        }}
                        className="group flex flex-col items-center gap-4 p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-black/80 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300"
                      >
                        <div className="relative">
                          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/50 to-primary border-2 border-primary/60 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300">
                            {(artist as any).profile_pic_url ? (
                              <img
                                src={(artist as any).profile_pic_url}
                                alt={artist.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <>
                                <Music className="w-12 h-12 text-white" />
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/40" />
                              </>
                            )}
                          </div>
                          {artist.verified && (
                            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-[0_0_12px_rgba(168,85,247,0.8)] animate-pulse">
                              <CheckCircle className="w-5 h-5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                            {artist.username}
                          </p>
                          {artist.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {artist.bio}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : searchQuery ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No artists found</p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-primary">Discover Top Artists</h3>
                  <p className="text-muted-foreground">Start searching to find artists you love</p>
                </>
              )}
            </div>
          </div>
        ) : (
          // Subscribed View - Discovery continues
          <div className="space-y-12">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-background border border-primary/30 mt-8 shadow-[0_0_40px_rgba(168,85,247,0.2)]"
            >
              <div className="relative z-10 px-6 py-16 md:py-24 text-center space-y-6">
                <h2 className="text-5xl md:text-6xl font-bold text-foreground border-b-2 border-primary inline-block pb-2" style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.5)' }}>
                  Where the real ones go
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Join exclusive artist communities and get early access to music, merch, tickets, and more
                </p>
                {/* Music Waveform Animation */}
                <div className="flex items-end justify-center gap-1 h-12 opacity-40">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1.5s'
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for artists to join their backstage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-base border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Discovery Grid */}
            <div className="max-w-6xl mx-auto space-y-6 pb-12">
              {isSearching ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Searching...</p>
                </div>
              ) : artists.length > 0 ? (
                <>
                  <h3 className="text-2xl font-bold text-primary border-b-2 border-primary inline-block pb-1">Search Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {artists.map((artist, index) => (
                      <motion.button
                        key={artist.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleArtistClick(artist.id)}
                        className="group flex flex-col items-center gap-4 p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-black/80 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300"
                      >
                        <div className="relative">
                          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/50 to-primary border-2 border-primary/60 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300">
                            {(artist as any).profile_pic_url ? (
                              <img
                                src={(artist as any).profile_pic_url}
                                alt={artist.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <>
                                <Music className="w-12 h-12 text-white" />
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/40" />
                              </>
                            )}
                          </div>
                          {artist.verified && (
                            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-[0_0_12px_rgba(168,85,247,0.8)] animate-pulse">
                              <CheckCircle className="w-5 h-5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                            {artist.username}
                          </p>
                          {artist.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {artist.bio}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : searchQuery ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No artists found</p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-primary border-b-2 border-primary inline-block pb-1">Discover Top Artists</h3>
                  <p className="text-muted-foreground">Start searching to find artists you love</p>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default Home;
