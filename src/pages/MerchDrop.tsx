import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingBag, Trash2, Plus, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactionRow from "@/components/lounge/ReactionRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageLightbox from "@/components/lounge/ImageLightbox";
import { useUserRole } from "@/hooks/useUserRole";

interface MerchDrop {
  id: string;
  message: string | null;
  image_url: string;
  buy_link: string | null;
  reactions: Record<string, number>;
  created_at: string;
  artist_id: string;
}

interface Community {
  name: string;
  theme_json: any;
  artist_id: string;
  wallpaper_url: string | null;
}

const MerchDrop = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isArtist: isUserArtist } = useUserRole();
  const [community, setCommunity] = useState<Community | null>(null);
  const [merchDrops, setMerchDrops] = useState<MerchDrop[]>([]);
  const [isArtist, setIsArtist] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [buyLink, setBuyLink] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");

  // Handle back navigation based on user role
  const handleBack = () => {
    if (isUserArtist) {
      navigate('/artist/dashboard');
    } else {
      navigate(`/community/${id}`);
    }
  };

  useEffect(() => {
    fetchCommunityAndMerch();
    checkIfArtist();
  }, [id]);

  // Real-time subscription for new merch drops
  useEffect(() => {
    if (!id) return;

    console.log("ROOM ID:", id);
    console.log("FETCHING FROM TABLE: merch_drops");

    const channel = supabase
      .channel('merch_drops_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'merch_drops', filter: `community_id=eq.${id}` },
        (payload) => {
          console.log("REAL-TIME INSERT:", payload);
          setMerchDrops(prev => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const checkIfArtist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: community } = await supabase
      .from("communities")
      .select("artist_id")
      .eq("id", id)
      .single();

    setIsArtist(community?.artist_id === user.id);
  };

  const fetchCommunityAndMerch = async () => {
    setLoading(true);
    
    const { data: communityData, error: communityError } = await supabase
      .from("communities")
      .select("name, theme_json, artist_id, wallpaper_url")
      .eq("id", id)
      .single();

    if (communityError) {
      console.error("Error fetching community:", communityError);
    } else if (communityData) {
      setCommunity(communityData);
    }

    const { data: merchData, error: merchError } = await supabase
      .from('merch_drops')
      .select('*')
      .eq('community_id', id)
      .order('created_at', { ascending: false });

    console.log("INITIAL FETCH:", merchData, merchError);
    if (merchError) {
      console.error("Error fetching merch drops:", merchError);
    } else {
      setMerchDrops((merchData as any) || []);
    }

    setLoading(false);
  };

  const handleDelete = async (merchId: string) => {
    const { error } = await supabase
      .from("merch_drops")
      .delete()
      .eq("id", merchId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete merch drop",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Merch drop deleted",
      });
      fetchCommunityAndMerch();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const isJPG = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
    const isPNG = fileName.endsWith('.png');
    
    if (!isJPG && !isPNG) {
      toast({
        title: "Invalid file type",
        description: "Only JPG and PNG images are allowed",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadMerch = async () => {
    if (!selectedFile) {
      toast({
        title: "Missing information",
        description: "Please select an image",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 280) {
      toast({
        title: "Message too long",
        description: "Message must be 280 characters or less",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const timestamp = Date.now();
      const filePath = `merch/${id}/${timestamp}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      // Insert into merch_drops table
      const { error: insertError } = await supabase
        .from("merch_drops")
        .insert({
          community_id: id,
          artist_id: currentUserId,
          message: message.trim() || null,
          image_url: publicUrl,
          buy_link: buyLink.trim() || null,
        });

      if (insertError) throw insertError;

      console.log("UPLOAD SUCCESS:", { community_id: id, message, image_url: publicUrl, buy_link: buyLink });

      toast({
        title: "Merch uploaded!",
        description: "Your merch drop has been uploaded successfully",
      });

      // Reset form and close modal
      setMessage("");
      setBuyLink("");
      setSelectedFile(null);
      setUploadModalOpen(false);

      // Trigger refetch
      fetchCommunityAndMerch();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: `Upload failed: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const openLightbox = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setLightboxOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const backgroundStyle = community?.wallpaper_url
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
    <div className="min-h-screen" style={backgroundStyle}>
      <div className="min-h-screen bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="mb-6 hover:bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{community?.name} - Merch Drop</h1>
          <p className="text-muted-foreground">Exclusive merchandise from the artist</p>
        </div>

        {merchDrops.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No merch drops yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {merchDrops.map((drop) => (
              <Card key={drop.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {drop.message && (
                      <p className="text-base mb-3">{drop.message}</p>
                    )}
                  </div>
                  {isArtist && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(drop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <img 
                  src={drop.image_url} 
                  alt="Merch" 
                  className="w-full rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openLightbox(drop.image_url)}
                />

                {drop.buy_link && (
                  <Button 
                    className="w-full mb-4 gradient-primary"
                    onClick={() => window.open(drop.buy_link!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                )}

                <ReactionRow postId={drop.id} reactions={drop.reactions} />
              </Card>
            ))}
          </div>
        )}
        </div>

        {/* Floating Upload Button - Only for Artists */}
        {isArtist && (
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gradient-primary hover:scale-105 transition-transform"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}

        {/* Upload Merch Modal */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Merch Drop</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merch-message">Message (Optional, max 280 chars)</Label>
                <Textarea
                  id="merch-message"
                  placeholder="Say something about this merch..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={280}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/280
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="merch-image">Image (JPG or PNG, max 5MB)</Label>
                <Input
                  id="merch-image"
                  type="file"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="buy-link">Buy Now Link (Optional)</Label>
                <Input
                  id="buy-link"
                  type="url"
                  placeholder="https://shop.example.com/item"
                  value={buyLink}
                  onChange={(e) => setBuyLink(e.target.value)}
                />
              </div>
              <Button
                onClick={handleUploadMerch}
                disabled={uploading || !selectedFile}
                className="w-full"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        <ImageLightbox 
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={lightboxImage}
          altText="Merch"
        />
      </div>
    </div>
  );
};

export default MerchDrop;
