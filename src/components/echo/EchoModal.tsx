import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EchoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  artistName: string;
  subscriptionId: string;
}

export const EchoModal = ({ open, onOpenChange, communityId, artistName, subscriptionId }: EchoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalPosts: number; totalReactions: number } | null>(null);

  const generateEcho = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to generate your Echo");
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-echo', {
        body: {
          user_id: user.id,
          community_id: communityId,
          artist_name: artistName
        }
      });

      if (error) throw error;

      setImageUrl(data.imageUrl);
      setStats(data.stats);
      
      // Update last_echo_generated timestamp
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ last_echo_generated: new Date().toISOString() })
        .eq("id", subscriptionId);

      if (updateError) {
        console.error("Failed to update last_echo_generated:", updateError);
      }
      
      toast.success("Your Echo has been generated!");
    } catch (error) {
      console.error("Error generating Echo:", error);
      toast.error("Failed to generate Echo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echo-${artistName}-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Echo downloaded!");
    } catch (error) {
      console.error("Error downloading Echo:", error);
      toast.error("Failed to download Echo");
    }
  };

  const handleShare = async () => {
    if (!imageUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Echo with ${artistName}`,
          text: `Check out my Echo Moments with ${artistName}!`,
          url: imageUrl
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
      navigator.clipboard.writeText(imageUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setImageUrl(null);
      setStats(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            Your Echo with {artistName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!imageUrl ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-muted-foreground text-center max-w-md">
                Generate a beautiful montage of your interactions with {artistName} from the last 30 days
              </p>
              <Button
                onClick={generateEcho}
                disabled={loading}
                className="bg-gradient-to-r from-primary to-pink-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Your Echo"
                )}
              </Button>
            </div>
          ) : (
            <>
              {stats && (
                <div className="flex justify-center gap-8 p-4 bg-gradient-to-r from-primary/10 to-pink-500/10 rounded-lg border border-primary/20">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{stats.totalPosts}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-teal-500">{stats.totalReactions}</div>
                    <div className="text-sm text-muted-foreground">Reactions</div>
                  </div>
                </div>
              )}

              <div className="relative rounded-lg overflow-hidden border border-primary/20">
                <img 
                  src={imageUrl} 
                  alt="Your Echo" 
                  className="w-full h-auto"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1 border-primary/20 hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex-1 bg-gradient-to-r from-primary to-pink-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
