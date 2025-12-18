import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Pin, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactionRow from "./ReactionRow";
import ImageLightbox from "./ImageLightbox";

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

interface PostCardProps {
  post: Post;
  communityId: string;
  onClick?: () => void;
  isReply?: boolean;
  onReply?: () => void;
  depth?: number;
}

const PostCard = ({ post, communityId, onClick, isReply = false, onReply, depth = 0 }: PostCardProps) => {
  // Guard against null/undefined post
  if (!post || !post.id) {
    return null;
  }
  const { toast } = useToast();
  const [replyCount, setReplyCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isArtist, setIsArtist] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // Fetch current user and check if artist
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // Check if user is the artist of this community
        const { data: community } = await supabase
          .from("communities")
          .select("artist_id")
          .eq("id", communityId)
          .single();

        setIsArtist(community?.artist_id === user.id);
      }
    };
    fetchUser();
  }, [communityId]);

  // Fetch reply count
  useEffect(() => {
    const fetchReplyCount = async () => {
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("parent_post_id", post.id);

      setReplyCount(count || 0);
    };

    if (!isReply) {
      fetchReplyCount();
    }
  }, [post.id, isReply]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("posts").delete().eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Deleted",
      description: "Post has been removed",
    });
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("posts")
      .update({ pinned: !post.pinned })
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: post.pinned ? "Unpinned" : "Pinned",
      description: post.pinned ? "Post unpinned" : "Post pinned to top",
    });
  };

  const canDelete = currentUserId === post.user_id || isArtist;
  const canPin = isArtist && !isReply;

  return (
    <div 
      className={`p-4 border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer ${depth > 0 ? `ml-${Math.min(depth * 8, 16)}` : ""}`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth * 2, 4)}rem` : '0' }}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={post.profiles?.profile_pic_url || undefined} alt={post.profiles?.username} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {post.profiles?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {post.profiles?.username || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.pinned && (
                <Pin className="w-4 h-4 text-primary" fill="currentColor" />
              )}
            </div>

            {/* Actions */}
            {(canPin || canDelete) && (
              <div className="flex items-center gap-1">
                {canPin && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePin}>
                    <Pin className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <p className="text-sm mb-2 whitespace-pre-wrap break-words">{post.text}</p>

          {/* Media */}
          {post.media_url && (
            <div className="mb-3">
              {post.media_type === "image" ? (
                <>
                  <img
                    src={post.media_url}
                    alt="Post media"
                    className="max-h-96 w-full object-cover rounded-2xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLightbox(true);
                    }}
                  />
                  <ImageLightbox
                    open={showLightbox}
                    onClose={() => setShowLightbox(false)}
                    imageUrl={post.media_url}
                    altText="Post image"
                  />
                </>
              ) : post.media_type === "video" ? (
                <video
                  controls
                  className="max-h-96 w-full rounded-2xl border border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <source src={post.media_url} />
                  Your browser does not support the video tag.
                </video>
              ) : post.media_type === "audio" ? (
                <audio 
                  controls 
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <source src={post.media_url} />
                  Your browser does not support the audio tag.
                </audio>
              ) : null}
            </div>
          )}

          {/* Reactions */}
          <div onClick={(e) => e.stopPropagation()}>
            <ReactionRow postId={post.id} reactions={post.reactions} />
          </div>

          {/* Reply Count */}
          {!isReply && replyCount > 0 && (
            <div className="flex items-center gap-2 mt-3 text-muted-foreground text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
            </div>
          )}

          {/* Reply Button for nested replies */}
          {isReply && onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onReply();
              }}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Reply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
