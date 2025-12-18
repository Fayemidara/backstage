import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Music2, ShoppingBag, Megaphone, Ticket, ListMusic, ArrowLeft } from "lucide-react";
import WelcomeAudioOverlay from "@/components/dashboard/WelcomeAudioOverlay";
import { motion } from "framer-motion";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Badge } from "@/components/ui/badge";

interface Community {
  id: string;
  artist_id: string;
  name: string;
  description: string | null;
  blend_active?: boolean;
  blend_link?: string | null;
  blend_full_at?: string | null;
  wallpaper_url?: string | null;
  welcome_audio_url?: string | null;
}

interface ArtistProfile {
  username: string;
}

const CommunityOverview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [community, setCommunity] = useState<Community | null>(null);
  const [artistName, setArtistName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showWelcomeAudio, setShowWelcomeAudio] = useState(false);
  const { unreadCounts, markRoomAsRead } = useUnreadCounts();

  console.log("🏘️ [CommunityOverview] Unread counts for community:", { id, unreadCounts });

  useEffect(() => {
    fetchCommunity();
  }, [id]);

  const fetchCommunity = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("communities")
      .select("id, artist_id, name, description, blend_active, blend_link, blend_full_at, wallpaper_url, welcome_audio_url")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching community:", error);
      navigate("/home");
    } else {
      setCommunity(data);
      
      // Fetch artist name
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.artist_id)
        .single();
      
      if (profile) {
        setArtistName(profile.username);
      }

      // Check if this is a new subscription (welcome param) and audio exists
      const isWelcome = searchParams.get("welcome") === "true";
      if (isWelcome && data.welcome_audio_url) {
        setShowWelcomeAudio(true);
        // Remove the welcome param from URL
        searchParams.delete("welcome");
        setSearchParams(searchParams);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!community) {
    return null;
  }

  const baseRooms = [
    { name: "Lounge", icon: MessageCircle, description: "Chat with the community", type: "lounge" },
    { name: "Music Drop", icon: Music2, description: "Exclusive music releases", type: "music-drop" },
    { name: "Merch Drop", icon: ShoppingBag, description: "Limited edition merchandise", type: "merch-drop" },
    { name: "Announcements", icon: Megaphone, description: "Latest updates from the artist", type: "announcements" },
    { name: "Ticket Drop", icon: Ticket, description: "Exclusive event tickets", type: "ticket-drop" },
  ];

  // Add Spotify Blend if enabled
  const rooms = community.blend_active
    ? [...baseRooms, { name: "Spotify Blend", icon: ListMusic, description: "Join the exclusive playlist", type: "spotify-blend" }]
    : baseRooms;

  const backgroundStyle = community.wallpaper_url
    ? {
        backgroundImage: `url(${community.wallpaper_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)',
      };

  return (
    <>
      {/* Welcome Audio Overlay */}
      {showWelcomeAudio && community?.welcome_audio_url && (
        <WelcomeAudioOverlay
          audioUrl={community.welcome_audio_url}
          artistName={artistName}
          onComplete={() => setShowWelcomeAudio(false)}
        />
      )}

      {/* Community Content with blur when welcome audio is playing */}
      <motion.div
        initial={false}
        animate={{
          filter: showWelcomeAudio ? "blur(20px)" : "blur(0px)",
          opacity: showWelcomeAudio ? 0.3 : 1,
        }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
        style={backgroundStyle}
      >
        <div className="min-h-screen bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/lineup")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lineup
          </Button>

          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold">
              Backstage with {community.name}
            </h2>
            {community.description && (
              <p className="text-muted-foreground">
                {community.description}
              </p>
            )}
          </div>

          {/* Room Tiles - First 4 in 2x2 grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {rooms.slice(0, 4).map((room) => {
              const Icon = room.icon;
              const unreadCount = community?.id ? (unreadCounts[community.id]?.byRoom[room.type] || 0) : 0;
              
              return (
                <button
                  key={room.name}
                  onClick={async () => {
                    // Mark room as read when entering
                    if (community?.id && unreadCount > 0) {
                      await markRoomAsRead(community.id, room.type);
                    }
                    navigate(`/community/${community.id}/${room.type}`);
                  }}
                  className="group aspect-square flex flex-col items-center justify-center gap-3 p-6 rounded-lg border border-border bg-gradient-to-br from-primary/20 to-background hover:from-primary/30 hover:to-background hover:border-primary/50 transition-all relative"
                >
                  {/* Unread badge */}
                  {unreadCount > 0 && (
                    <Badge 
                      className="absolute top-2 right-2 h-6 min-w-[24px] px-2 flex items-center justify-center text-xs bg-teal-500 hover:bg-teal-500 border-0"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{room.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {room.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Bottom Row - Remaining rooms (Ticket Drop + optional Spotify Blend) */}
          {rooms.length > 4 && (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {rooms.slice(4).map((room) => {
                const Icon = room.icon;
                const unreadCount = community?.id ? (unreadCounts[community.id]?.byRoom[room.type] || 0) : 0;
                
                return (
                  <button
                    key={room.name}
                    onClick={async () => {
                      // Mark room as read when entering
                      if (community?.id && unreadCount > 0) {
                        await markRoomAsRead(community.id, room.type);
                      }
                      navigate(`/community/${community.id}/${room.type}`);
                    }}
                    className="group aspect-square flex flex-col items-center justify-center gap-3 p-6 rounded-lg border border-border bg-gradient-to-br from-primary/20 to-background hover:from-primary/30 hover:to-background hover:border-primary/50 transition-all relative"
                  >
                    {/* Unread badge */}
                    {unreadCount > 0 && (
                      <Badge 
                        className="absolute top-2 right-2 h-6 min-w-[24px] px-2 flex items-center justify-center text-xs bg-teal-500 hover:bg-teal-500 border-0"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{room.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {room.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </motion.div>
    </>
  );
};

export default CommunityOverview;
