import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Megaphone, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactionRow from "@/components/lounge/ReactionRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ImageLightbox from "@/components/lounge/ImageLightbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";

interface Announcement {
  id: string;
  message: string | null;
  image_url: string | null;
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

const Announcements = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isArtist: isUserArtist } = useUserRole();
  const [community, setCommunity] = useState<Community | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isArtist, setIsArtist] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
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
    fetchCommunityAndAnnouncements();
    checkIfArtist();
  }, [id]);

  // Real-time subscription for new announcements
  useEffect(() => {
    if (!id) return;

    console.log("ROOM ID:", id);
    console.log("FETCHING FROM TABLE: announcements");

    const channel = supabase
      .channel('announcements_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements', filter: `community_id=eq.${id}` },
        (payload) => {
          console.log("REAL-TIME INSERT:", payload);
          setAnnouncements(prev => [payload.new as any, ...prev]);
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

  const fetchCommunityAndAnnouncements = async () => {
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

    const { data: announcementsData, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('community_id', id)
      .order('created_at', { ascending: false });

    console.log("INITIAL FETCH:", announcementsData, announcementsError);
    if (announcementsError) {
      console.error("Error fetching announcements:", announcementsError);
    } else {
      setAnnouncements((announcementsData as any) || []);
    }

    setLoading(false);
  };

  const handleDelete = async (announcementId: string) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement deleted",
      });
      fetchCommunityAndAnnouncements();
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

  const handleUploadAnnouncement = async () => {
    // Validate: at least one of message or image is required
    if (!message.trim() && !selectedFile) {
      toast({
        title: "Missing content",
        description: "Please provide a message or image",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 500) {
      toast({
        title: "Message too long",
        description: "Message must be 500 characters or less",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (selectedFile) {
        const timestamp = Date.now();
        const filePath = `announcements/${id}/${timestamp}_${selectedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert into announcements table
      const { error: insertError } = await supabase
        .from("announcements")
        .insert({
          community_id: id,
          artist_id: currentUserId,
          message: message.trim() || null,
          image_url: imageUrl,
        });

      if (insertError) throw insertError;

      console.log("UPLOAD SUCCESS:", { community_id: id, message, image_url: imageUrl });

      toast({
        title: "Announcement posted!",
        description: "Your announcement has been posted successfully",
      });

      // Reset form and close modal
      setMessage("");
      setSelectedFile(null);
      setUploadModalOpen(false);

      // Trigger refetch
      fetchCommunityAndAnnouncements();
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
          <h1 className="text-4xl font-bold mb-2">{community?.name} - Announcements</h1>
          <p className="text-muted-foreground">Official announcements from the artist</p>
        </div>

        {announcements.length === 0 ? (
          <Card className="p-12 text-center">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No announcements yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Artist</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {isArtist && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {announcement.image_url && (
                  <img 
                    src={announcement.image_url} 
                    alt="Announcement" 
                    className="w-full rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openLightbox(announcement.image_url!)}
                  />
                )}

                {announcement.message && (
                  <p className="text-base mb-3 whitespace-pre-wrap">{announcement.message}</p>
                )}

                <ReactionRow postId={announcement.id} reactions={announcement.reactions} />
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

        {/* Upload Announcement Modal */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="announcement-message">Message (Optional, max 500 chars)</Label>
                <Textarea
                  id="announcement-message"
                  placeholder="Share an announcement with your fans..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/500
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-image">Image (Optional, JPG or PNG, max 5MB)</Label>
                <Input
                  id="announcement-image"
                  type="file"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <Button
                onClick={handleUploadAnnouncement}
                disabled={uploading || (!message.trim() && !selectedFile)}
                className="w-full"
              >
                {uploading ? "Posting..." : "Post"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        <ImageLightbox 
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={lightboxImage}
          altText="Announcement"
        />
      </div>
    </div>
  );
};

export default Announcements;
