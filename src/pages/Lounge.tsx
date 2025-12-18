import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/lounge/PostCard";
import PostModal from "@/components/lounge/PostModal";
import ExpandedPost from "@/components/lounge/ExpandedPost";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";

interface Post {
  id: string;
  community_id: string;
  user_id: string;
  text: string;
  media_url: string | null;
  media_type: string | null;
  parent_post_id: string | null;
  reactions: Record<string, number> | any;
  pinned: boolean;
  created_at: string;
  profiles?: {
    username: string;
    profile_pic_url?: string;
  };
}

const Lounge = () => {
  const { id: communityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isArtist } = useUserRole();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityName, setCommunityName] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  // Handle back navigation based on user role
  const handleBack = () => {
    if (isArtist) {
      navigate('/artist/dashboard');
    } else {
      navigate(`/community/${communityId}`);
    }
  };

  // Use React Query for community details
  const { data: community } = useQuery({
    queryKey: ["community", communityId],
    queryFn: async () => {
      if (!communityId) return null;
      const { data, error } = await supabase
        .from("communities")
        .select("name, wallpaper_url")
        .eq("id", communityId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load community details",
          variant: "destructive",
        });
        return null;
      }
      return data;
    },
    enabled: !!communityId,
  });

  // Update local state when community data loads
  useEffect(() => {
    if (community) {
      setCommunityName(community.name);
      setWallpaperUrl(community.wallpaper_url || null);
    }
  }, [community]);

  // Fetch posts (only top-level posts, not replies)
  useEffect(() => {
    const fetchPosts = async () => {
      if (!communityId) return;

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("community_id", communityId)
        .is("parent_post_id", null)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load posts",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch profiles for all posts
      const postsWithProfiles = await Promise.all(
        (data || []).map(async (post) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, profile_pic_url")
            .eq("id", post.user_id)
            .single();
          
          return {
            ...post,
            profiles: profile,
          };
        })
      );

      setPosts(postsWithProfiles as Post[]);
      setLoading(false);
    };

    fetchPosts();
  }, [communityId, toast]);

  // Real-time subscription for new posts (optimized with setTimeout)
  useEffect(() => {
    if (!communityId) return;

    const channel = supabase
      .channel(`lounge-${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          // Defer async operations to prevent blocking
          setTimeout(() => {
            (async () => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, profile_pic_url")
                .eq("id", payload.new.user_id)
                .single();

              const newPost = {
                ...payload.new,
                profiles: profile,
              } as Post;

              // Only add top-level posts to the feed
              if (!newPost.parent_post_id) {
                setPosts((prev) => [newPost, ...prev]);
              }
            })();
          }, 0);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === payload.new.id ? { ...post, ...payload.new } : post
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "posts",
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show expanded post view
  if (expandedPostId) {
    const post = posts.find(p => p.id === expandedPostId);
    if (post) {
      return (
        <ExpandedPost 
          post={post} 
          communityId={communityId!} 
          onClose={() => setExpandedPostId(null)}
        />
      );
    }
  }

  return (
    <div 
      className="min-h-screen bg-background"
      style={wallpaperUrl ? {
        backgroundImage: `url(${wallpaperUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : undefined}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{communityName}</h1>
            <p className="text-sm text-muted-foreground">Lounge</p>
          </div>
        </div>
      </header>

      {/* Posts Feed */}
      <main className="max-w-2xl mx-auto">
        <div>
          {posts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-lg mb-2">Start the convo!</p>
              <p className="text-sm">Be the first to share something with the community</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                communityId={communityId!}
                onClick={() => setExpandedPostId(post.id)}
              />
            ))
          )}
        </div>
      </main>

      {/* Floating Post Button */}
      <Button
        onClick={() => setShowPostModal(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gradient-primary hover:scale-105 transition-transform"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Post Modal */}
      <PostModal
        open={showPostModal}
        onClose={() => setShowPostModal(false)}
        communityId={communityId!}
      />
    </div>
  );
};

export default Lounge;
