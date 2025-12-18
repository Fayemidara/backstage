import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import PostCard from "./PostCard";
import PostModal from "./PostModal";
import NestedReplies from "./NestedReplies";

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

interface ExpandedPostProps {
  post: Post;
  communityId: string;
  onClose: () => void;
}

const ExpandedPost = ({ post, communityId, onClose }: ExpandedPostProps) => {
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Guard against null/undefined post
  if (!post || !post.id) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Post</h1>
          </div>
        </div>
      </header>

      {/* Main Post */}
      <main className="max-w-2xl mx-auto">
        <PostCard post={post} communityId={communityId} isReply={false} />

        {/* Reply Button */}
        <div className="px-4 py-3 border-b border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowReplyModal(true)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Reply to this post
          </Button>
        </div>

        {/* Replies Section with Nested Threading */}
        <div>
          <NestedReplies
            parentPostId={post.id}
            communityId={communityId}
            depth={1}
          />
        </div>
      </main>

      {/* Reply Modal */}
      <PostModal
        open={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        communityId={communityId}
        parentPostId={post.id}
        placeholder="Post your reply"
      />
    </div>
  );
};

export default ExpandedPost;
