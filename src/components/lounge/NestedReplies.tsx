import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import PostCard from "./PostCard";
import PostModal from "./PostModal";

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

interface NestedRepliesProps {
  parentPostId: string;
  communityId: string;
  depth?: number;
}

const NestedReplies = ({ parentPostId, communityId, depth = 0 }: NestedRepliesProps) => {
  const { toast } = useToast();
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReplies = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("parent_post_id", parentPostId)
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load replies",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch profiles for all replies
      const repliesWithProfiles = await Promise.all(
        (data || []).map(async (reply) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, profile_pic_url")
            .eq("id", reply.user_id)
            .single();
          
          return {
            ...reply,
            profiles: profile,
          };
        })
      );

      setReplies(repliesWithProfiles as Post[]);
      setLoading(false);
    };

    fetchReplies();

    // Real-time subscription for new replies
    const channel = supabase
      .channel(`nested-replies-${parentPostId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `parent_post_id=eq.${parentPostId}`,
        },
        async (payload) => {
          if (!payload.new) return;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, profile_pic_url")
            .eq("id", payload.new.user_id)
            .single();

          const newReply = {
            ...payload.new,
            profiles: profile,
          } as Post;

          setReplies((prev) => [...prev, newReply]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "posts",
          filter: `parent_post_id=eq.${parentPostId}`,
        },
        (payload) => {
          if (!payload.old) return;
          setReplies((prev) => prev.filter((reply) => reply.id !== payload.old.id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `parent_post_id=eq.${parentPostId}`,
        },
        (payload) => {
          if (!payload.new) return;
          setReplies((prev) =>
            prev.map((reply) =>
              reply.id === payload.new.id ? { ...reply, ...payload.new } : reply
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentPostId, communityId, toast]);

  if (loading) {
    return (
      <div className="py-4 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  if (replies.length === 0) {
    return null;
  }

  return (
    <>
      {replies.map((reply) => (
        <div key={reply.id}>
          <PostCard
            post={reply}
            communityId={communityId}
            isReply
            depth={depth}
            onReply={() => setReplyingToId(reply.id)}
          />
          {/* Recursively render nested replies (limit depth to prevent infinite nesting) */}
          {depth < 5 && (
            <NestedReplies
              parentPostId={reply.id}
              communityId={communityId}
              depth={depth + 1}
            />
          )}
        </div>
      ))}

      {/* Reply Modal */}
      {replyingToId && (
        <PostModal
          open={true}
          onClose={() => setReplyingToId(null)}
          communityId={communityId}
          parentPostId={replyingToId}
          placeholder="Post your reply"
        />
      )}
    </>
  );
};

export default NestedReplies;
