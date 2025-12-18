import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import ReactionRow from "@/components/lounge/ReactionRow";
import ImageLightbox from "@/components/lounge/ImageLightbox";
import { useUserRole } from "@/hooks/useUserRole";

interface TicketDrop {
  id: string;
  message: string | null;
  image_url: string | null;
  ticket_link: string | null;
  ends_at: string;
  reactions: Record<string, number> | any;
  created_at: string;
}

interface Community {
  name: string;
  theme_json: any;
  artist_id: string;
  wallpaper_url: string | null;
}

const TicketDrop = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isArtist: isUserArtist } = useUserRole();

  const [community, setCommunity] = useState<Community | null>(null);
  const [ticketDrops, setTicketDrops] = useState<TicketDrop[]>([]);
  const [isArtist, setIsArtist] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Upload form state
  const [message, setMessage] = useState("");
  const [ticketLink, setTicketLink] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Lightbox state
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
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (id && userId) {
      fetchCommunityAndTickets();
      checkIfArtist();
    }
  }, [id, userId]);

  // Real-time subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel("ticket_drops")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_drops",
          filter: `community_id=eq.${id}`,
        },
        (payload) => {
          setTicketDrops((prev) => [payload.new as TicketDrop, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ticket_drops",
          filter: `community_id=eq.${id}`,
        },
        (payload) => {
          setTicketDrops((prev) =>
            prev.map((drop) =>
              drop.id === payload.new.id ? (payload.new as TicketDrop) : drop
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ticket_drops",
          filter: `community_id=eq.${id}`,
        },
        (payload) => {
          setTicketDrops((prev) => prev.filter((drop) => drop.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Timer for countdown updates (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      setTicketDrops((prev) => [...prev]); // Force re-render to update countdowns
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkIfArtist = async () => {
    if (!userId || !id) return;

    const { data: communityData } = await supabase
      .from("communities")
      .select("artist_id")
      .eq("id", id)
      .single();

    if (communityData && communityData.artist_id === userId) {
      setIsArtist(true);
    }
  };

  const fetchCommunityAndTickets = async () => {
    setLoading(true);

    // Fetch community details
    const { data: communityData, error: communityError } = await supabase
      .from("communities")
      .select("name, theme_json, artist_id, wallpaper_url")
      .eq("id", id)
      .single();

    if (communityError) {
      toast({
        title: "Error",
        description: "Failed to load community",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setCommunity(communityData);

    // Fetch ticket drops
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("ticket_drops")
      .select("*")
      .eq("community_id", id)
      .order("created_at", { ascending: false });

    if (ticketsError) {
      toast({
        title: "Error",
        description: "Failed to load ticket drops",
        variant: "destructive",
      });
    } else {
      setTicketDrops(ticketsData || []);
    }

    setLoading(false);
  };

  const handleDelete = async (ticketId: string) => {
    const { error } = await supabase
      .from("ticket_drops")
      .delete()
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket drop",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Ticket drop deleted",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Filter file types in code (no accept attribute)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".jpg") && !fileName.endsWith(".jpeg") && !fileName.endsWith(".png")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG or PNG image",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadTicket = async () => {
    if (!id || !userId) return;

    // Validate: message and ends_at are required
    if (!message.trim() && !selectedFile) {
      toast({
        title: "Required fields",
        description: "Please provide a message or image",
        variant: "destructive",
      });
      return;
    }

    if (!ticketLink.trim()) {
      toast({
        title: "Required fields",
        description: "Please provide a ticket link",
        variant: "destructive",
      });
      return;
    }

    if (!endsAt) {
      toast({
        title: "Required fields",
        description: "Please set a sale end date",
        variant: "destructive",
      });
      return;
    }

    // Validate ends_at is in the future
    const endsAtDate = new Date(endsAt);
    if (endsAtDate <= new Date()) {
      toast({
        title: "Invalid date",
        description: "Sale end date must be in the future",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 280) {
      toast({
        title: "Message too long",
        description: "Please keep your message under 280 characters",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    let imageUrl = null;

    // Upload image if selected
    if (selectedFile) {
      const timestamp = Date.now();
      const filePath = `tickets/${id}/${timestamp}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, selectedFile);

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: "Failed to upload image",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      imageUrl = urlData.publicUrl;
    }

    // Insert into database
    const { error: insertError } = await supabase.from("ticket_drops").insert({
      community_id: id,
      artist_id: userId,
      message: message.trim() || null,
      image_url: imageUrl,
      ticket_link: ticketLink.trim(),
      ends_at: endsAtDate.toISOString(),
    });

    if (insertError) {
      toast({
        title: "Error",
        description: "Failed to create ticket drop",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Ticket drop created!",
    });

    // Reset form
    setMessage("");
    setTicketLink("");
    setEndsAt("");
    setSelectedFile(null);
    setShowModal(false);
    setUploading(false);
  };

  const getCountdown = (endsAt: string) => {
    const timeLeft = new Date(endsAt).getTime() - new Date().getTime();
    if (timeLeft <= 0) {
      return "Sold Out";
    }

    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const mins = Math.floor((timeLeft % 3600000) / 60000);

    return `${days}d ${hours}h ${mins}m left`;
  };

  const isExpired = (endsAt: string) => {
    return new Date(endsAt) <= new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: community?.wallpaper_url
          ? `url(${community.wallpaper_url})`
          : "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))",
      }}
    >
      <div className="min-h-screen bg-background/80 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="hover:bg-secondary"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {community?.name}
              </h1>
              <p className="text-muted-foreground">Ticket Drops</p>
            </div>
          </div>

          {/* Ticket Drops List */}
          {ticketDrops.length === 0 ? (
            <Card className="p-8 text-center bg-card/50 backdrop-blur border-border">
              <p className="text-muted-foreground">No ticket drops yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {ticketDrops.map((drop) => (
                <Card
                  key={drop.id}
                  className="p-6 bg-card/50 backdrop-blur border-border hover:bg-card/70 transition-colors"
                >
                  {drop.image_url && (
                    <img
                      src={drop.image_url}
                      alt="Ticket drop"
                      className="w-full h-64 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setLightboxImage(drop.image_url!);
                        setLightboxOpen(true);
                      }}
                    />
                  )}

                  {drop.message && (
                    <p className="text-foreground mb-4 whitespace-pre-wrap">
                      {drop.message}
                    </p>
                  )}

                  {/* Countdown */}
                  <div className="mb-4">
                    <p
                      className={`text-lg font-semibold ${
                        isExpired(drop.ends_at)
                          ? "text-muted-foreground"
                          : "text-primary"
                      }`}
                    >
                      {getCountdown(drop.ends_at)}
                    </p>
                  </div>

                  {/* Buy Button */}
                  {drop.ticket_link && (
                    <Button
                      asChild
                      className="w-full mb-4"
                      variant={isExpired(drop.ends_at) ? "secondary" : "default"}
                      disabled={isExpired(drop.ends_at)}
                    >
                      <a
                        href={drop.ticket_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={isExpired(drop.ends_at) ? "pointer-events-none" : ""}
                      >
                        {isExpired(drop.ends_at) ? "Sold Out" : "Buy Ticket"}
                      </a>
                    </Button>
                  )}

                  {/* Reactions */}
                  <ReactionRow postId={drop.id} reactions={drop.reactions} />

                  {/* Delete button for artist */}
                  {isArtist && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(drop.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Floating Add Button (Artist Only) */}
          {isArtist && (
            <Button
              size="lg"
              className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg bg-primary hover:bg-primary/90"
              onClick={() => setShowModal(true)}
            >
              <Plus className="w-6 h-6" />
            </Button>
          )}

          {/* Upload Modal */}
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Create Ticket Drop
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Image (Optional, JPG/PNG, max 5MB)
                  </label>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Message (max 280 characters)
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Announce your ticket sale..."
                    className="bg-background border-border text-foreground min-h-[100px]"
                    maxLength={280}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.length}/280
                  </p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Ticket Link (Required)
                  </label>
                  <Input
                    type="url"
                    value={ticketLink}
                    onChange={(e) => setTicketLink(e.target.value)}
                    placeholder="https://..."
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Sale Ends At (Required)
                  </label>
                  <Input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <Button
                  onClick={handleUploadTicket}
                  disabled={uploading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {uploading ? "Creating..." : "Create Ticket Drop"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Image Lightbox */}
          <ImageLightbox
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            imageUrl={lightboxImage}
            altText="Ticket drop image"
          />
        </div>
      </div>
    </div>
  );
};

export default TicketDrop;
