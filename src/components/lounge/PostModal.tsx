import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Image, Music, Video, X, Loader2 } from "lucide-react";
import { createNotificationsForCommunity } from "@/lib/notificationUtils";

interface PostModalProps {
  open: boolean;
  onClose: () => void;
  communityId: string;
  parentPostId?: string;
  placeholder?: string;
}

const PostModal = ({ open, onClose, communityId, parentPostId, placeholder = "What's happening?" }: PostModalProps) => {
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        
        setCurrentUser({ id: user.id, username: profile?.username || "User" });
      }
    };
    if (open) {
      fetchUser();
    }
  }, [open]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "audio" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max for video, 5MB for others)
    const maxSize = type === "video" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(type === "video" ? "Video must be under 10MB" : "File must be under 5MB");
      return;
    }

    setMediaFile(file);

    // Create preview for images and videos
    if (type === "image" || type === "video") {
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(file.name);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !mediaFile) return;
    if (text.length > 280) {
      toast.error("Posts must be 280 characters or less");
      return;
    }

    setUploading(true);

    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `${currentUser!.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith("image/") 
          ? "image" 
          : mediaFile.type.startsWith("video/") 
          ? "video" 
          : "audio";
      }

      // Create post
      const { data: postData, error } = await supabase.from("posts").insert({
        community_id: communityId,
        user_id: currentUser!.id,
        text: text.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        parent_post_id: parentPostId || null,
      }).select().single();

      if (error) throw error;

      // Create notifications for top-level posts (not replies)
      if (!parentPostId && postData) {
        console.log("📢 [PostModal] Creating notifications for post:", postData);
        
        // Get community and artist info for notification message
        const { data: community } = await supabase
          .from("communities")
          .select("name, artist_id")
          .eq("id", communityId)
          .single();

        console.log("🏘️ [PostModal] Community data:", community);

        if (community) {
          // Get artist username
          const { data: artistProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", community.artist_id)
            .single();

          const artistName = artistProfile?.username || "Artist";
          console.log("🎤 [PostModal] Artist name:", artistName);

          await createNotificationsForCommunity({
            communityId,
            type: "post",
            message: `${artistName} just posted in Lounge`,
            referenceId: postData.id,
          });
        }
      }

      // Reset form
      setText("");
      removeMedia();
      onClose();
      
      toast.success(parentPostId ? "Reply posted!" : "Post created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create post—retry?", {
        action: {
          label: "Retry",
          onClick: handleSubmit,
        },
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>{parentPostId ? "Reply" : "New Post"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-3 mt-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary">
              {currentUser?.username[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="min-h-[120px] resize-none border-none focus-visible:ring-0 p-0 text-base bg-transparent"
              maxLength={280}
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative inline-block">
                {mediaFile?.type.startsWith("image/") ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="max-h-64 rounded-2xl border border-border"
                  />
                ) : mediaFile?.type.startsWith("video/") ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="max-h-64 rounded-2xl border border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg border border-border">
                    <Music className="w-5 h-5" />
                    <span className="text-sm">{mediaPreview}</span>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                  onClick={removeMedia}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                <label htmlFor="image-upload-modal" className="cursor-pointer">
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary" asChild>
                    <span>
                      <Image className="w-5 h-5" />
                    </span>
                  </Button>
                  <input
                    id="image-upload-modal"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleMediaChange(e, "image")}
                  />
                </label>

                <label htmlFor="audio-upload-modal" className="cursor-pointer">
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary" asChild>
                    <span>
                      <Music className="w-5 h-5" />
                    </span>
                  </Button>
                  <input
                    id="audio-upload-modal"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleMediaChange(e, "audio")}
                  />
                </label>

                <label htmlFor="video-upload-modal" className="cursor-pointer">
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary" asChild>
                    <span>
                      <Video className="w-5 h-5" />
                    </span>
                  </Button>
                  <input
                    id="video-upload-modal"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    className="hidden"
                    onChange={(e) => handleMediaChange(e, "video")}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm ${text.length > 280 ? "text-destructive" : "text-muted-foreground"}`}>
                  {text.length}/280
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={(!text.trim() && !mediaFile) || uploading || text.length > 280}
                  className="gradient-primary"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    parentPostId ? "Reply" : "Post"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostModal;
