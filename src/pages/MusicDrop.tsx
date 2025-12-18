import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Music, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactionRow from "@/components/lounge/ReactionRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";

interface MusicDrop {
  id: string;
  title: string;
  file_url: string;
  reactions: Record<string, number>;
  created_at: string;
  artist_id: string;
  profiles: {
    username: string;
  };
}

interface Community {
  name: string;
  theme_json: any;
  artist_id: string;
  wallpaper_url: string | null;
}

const MusicDrop = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isArtist: isUserArtist } = useUserRole();
  const [community, setCommunity] = useState<Community | null>(null);
  const [musicDrops, setMusicDrops] = useState<MusicDrop[]>([]);
  const [isArtist, setIsArtist] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle back navigation based on user role
  const handleBack = () => {
    if (isUserArtist) {
      navigate('/artist/dashboard');
    } else {
      navigate(`/community/${id}`);
    }
  };

  useEffect(() => {
    fetchCommunityAndMusic();
    checkIfArtist();
  }, [id]);

  // Real-time subscription for new music drops (optimized)
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('music_drops_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'music_drops', filter: `community_id=eq.${id}` },
        (payload) => {
          // Update state immediately (no async needed for simple insert)
          setMusicDrops(prev => [payload.new as any, ...prev]);
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

  const fetchCommunityAndMusic = async () => {
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

    const { data: musicData, error: musicError } = await supabase
      .from('music_drops')
      .select('*')
      .eq('community_id', id)
      .order('created_at', { ascending: false });

    console.log("INITIAL FETCH:", musicData, musicError);
    if (musicError) {
      console.error("Error fetching music drops:", musicError);
    } else {
      setMusicDrops((musicData as any) || []);
    }

    setLoading(false);
  };

  const handleDelete = async (musicId: string) => {
    const { error } = await supabase
      .from("music_drops")
      .delete()
      .eq("id", musicId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete music drop",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Music drop deleted",
      });
      fetchCommunityAndMusic();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension (iOS-friendly approach)
    const fileName = file.name.toLowerCase();
    const isMP3 = fileName.endsWith('.mp3');
    const isM4A = fileName.endsWith('.m4a');
    
    if (!isMP3 && !isM4A) {
      toast({
        title: "Invalid file type",
        description: "Only MP3 and M4A files are allowed",
        variant: "destructive",
      });
      // Reset the input
      e.target.value = '';
      return;
    }

    // Validate file size (30MB max)
    if (file.size > 30 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 30MB",
        variant: "destructive",
      });
      // Reset the input
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadTrack = async () => {
    if (!trackTitle.trim() || !selectedFile) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const timestamp = Date.now();
      const filePath = `music/${id}/${timestamp}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      // Insert into music_drops table
      const { error: insertError } = await supabase
        .from("music_drops")
        .insert({
          community_id: id,
          artist_id: currentUserId,
          title: trackTitle,
          file_url: publicUrl,
        });

      if (insertError) throw insertError;

      console.log("UPLOAD SUCCESS:", { community_id: id, title: trackTitle, file_url: publicUrl });

      toast({
        title: "Track uploaded!",
        description: "Your track has been uploaded successfully",
      });

      // Reset form and close modal
      setTrackTitle("");
      setSelectedFile(null);
      setUploadModalOpen(false);

      // Trigger refetch
      fetchCommunityAndMusic();
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
          <h1 className="text-4xl font-bold mb-2">{community?.name} - Music Drop</h1>
          <p className="text-muted-foreground">Listen to exclusive tracks from the artist</p>
        </div>

        {musicDrops.length === 0 ? (
          <Card className="p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No music drops yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {musicDrops.map((drop) => (
              <Card key={drop.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{drop.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {drop.profiles?.username} • {new Date(drop.created_at).toLocaleDateString()}
                    </p>
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

                <audio controls className="w-full mb-4" src={drop.file_url}>
                  Your browser does not support the audio element.
                </audio>

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

        {/* Upload Track Modal */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Music Track</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="track-title">Track Title</Label>
                <Input
                  id="track-title"
                  placeholder="Enter track title"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-file">Audio File (MP3 or M4A, max 30MB)</Label>
                <Input
                  id="track-file"
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
                onClick={handleUploadTrack}
                disabled={uploading || !trackTitle.trim() || !selectedFile}
                className="w-full"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MusicDrop;
