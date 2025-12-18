import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Upload, X, Music } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ThemeCustomizationProps {
  userId: string;
}

const colors = [
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Red", value: "#EF4444" },
];

const wallpapers = [
  { name: "Gradient", value: "gradient" },
  { name: "Dark", value: "dark" },
  { name: "Light", value: "light" },
  { name: "Cosmic", value: "cosmic" },
];

const ThemeCustomization = ({ userId }: ThemeCustomizationProps) => {
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState({
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    wallpaper: "gradient",
  });
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [wallpaperFile, setWallpaperFile] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  // Welcome audio state
  const [welcomeAudioUrl, setWelcomeAudioUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Echo track state
  const [echoTrackUrl, setEchoTrackUrl] = useState<string | null>(null);
  const [echoClipStart, setEchoClipStart] = useState<number>(0);
  const [echoClipEnd, setEchoClipEnd] = useState<number>(10);
  const [uploadingEcho, setUploadingEcho] = useState(false);
  const [echoFile, setEchoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCommunity();
  }, [userId]);

  const fetchCommunity = async () => {
    const { data } = await supabase
      .from("communities")
      .select("*")
      .eq("artist_id", userId)
      .maybeSingle();

    if (data) {
      setCommunity(data);
      if (data.theme_json && typeof data.theme_json === 'object') {
        const themeData = data.theme_json as { primaryColor?: string; secondaryColor?: string; wallpaper?: string };
        setTheme({
          primaryColor: themeData.primaryColor || "#8B5CF6",
          secondaryColor: themeData.secondaryColor || "#EC4899",
          wallpaper: themeData.wallpaper || "gradient",
        });
      }
      setWallpaperUrl(data.wallpaper_url || null);
      setWelcomeAudioUrl(data.welcome_audio_url || null);
      setEchoTrackUrl(data.echo_track_url || null);
      setEchoClipStart(data.echo_clip_start || 0);
      setEchoClipEnd(data.echo_clip_end || 10);
    }

    // Fetch profile picture
    const { data: profileData } = await supabase
      .from("profiles")
      .select("profile_pic_url")
      .eq("id", userId)
      .maybeSingle();

    if (profileData) {
      setProfilePicUrl(profileData.profile_pic_url || null);
    }

    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a JPG or PNG image");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Wallpaper must be less than 5MB");
      return;
    }

    setWallpaperFile(file);
  };

  const handleUploadWallpaper = async () => {
    if (!wallpaperFile || !community) {
      console.log("Upload aborted: missing file or community", { wallpaperFile, community });
      return;
    }

    console.log("Starting wallpaper upload for community:", community.id);
    setUploading(true);

    try {
      // Delete old wallpaper if exists
      if (wallpaperUrl) {
        console.log("Removing old wallpaper:", wallpaperUrl);
        const oldPath = wallpaperUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("wallpapers")
            .remove([`${community.id}/${oldPath}`]);
        }
      }

      // Upload new wallpaper
      const fileExt = wallpaperFile.name.split(".").pop();
      const fileName = `wallpaper_${community.id}_${Date.now()}.${fileExt}`;
      const filePath = `${community.id}/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("wallpapers")
        .upload(filePath, wallpaperFile);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("wallpapers")
        .getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      // Update community with new wallpaper URL
      const { error: updateError } = await supabase
        .from("communities")
        .update({ wallpaper_url: publicUrl })
        .eq("id", community.id);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }

      console.log("Community updated with wallpaper URL");

      setWallpaperUrl(publicUrl);
      setWallpaperFile(null);

      toast.success("Wallpaper uploaded!");
    } catch (error: any) {
      console.error("Upload error details:", {
        message: error?.message,
        statusCode: error?.statusCode,
        error: error
      });

      toast.error(error?.message || "Upload failed—retry?", {
        action: {
          label: "Retry",
          onClick: handleUploadWallpaper,
        },
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveWallpaper = async () => {
    if (!community || !wallpaperUrl) return;

    setUploading(true);

    try {
      // Delete from storage
      const oldPath = wallpaperUrl.split("/").pop();
      if (oldPath) {
        await supabase.storage
          .from("wallpapers")
          .remove([`${community.id}/${oldPath}`]);
      }

      // Update community
      const { error } = await supabase
        .from("communities")
        .update({ wallpaper_url: null })
        .eq("id", community.id);

      if (error) throw error;

      setWallpaperUrl(null);

      toast.success("Wallpaper removed!");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove wallpaper—retry?", {
        action: {
          label: "Retry",
          onClick: handleRemoveWallpaper,
        },
      });
    } finally {
      setUploading(false);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a JPG or PNG image");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture must be less than 2MB");
      return;
    }

    setProfilePicFile(file);
  };

  const handleUploadProfilePic = async () => {
    if (!profilePicFile) return;

    console.log("Starting profile pic upload for user:", userId);
    setUploadingProfile(true);

    try {
      // Delete old profile pic if exists
      if (profilePicUrl) {
        console.log("Removing old profile pic:", profilePicUrl);
        const urlParts = profilePicUrl.split("/");
        const fileName = urlParts.pop();
        if (fileName) {
          await supabase.storage
            .from("media")
            .remove([`profiles/${userId}/${fileName}`]);
        }
      }

      // Upload new profile pic
      const fileExt = profilePicFile.name.split(".").pop();
      const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${userId}/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("media")
        .upload(filePath, profilePicFile);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      // Update profile with new pic URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_pic_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }

      console.log("Profile updated with pic URL");

      setProfilePicUrl(publicUrl);
      setProfilePicFile(null);

      toast.success("Profile picture updated!");
    } catch (error: any) {
      console.error("Upload error details:", {
        message: error?.message,
        statusCode: error?.statusCode,
        error: error
      });

      toast.error(error?.message || "Upload failed—retry?", {
        action: {
          label: "Retry",
          onClick: handleUploadProfilePic,
        },
      });
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleRemoveProfilePic = async () => {
    if (!profilePicUrl) return;

    setUploadingProfile(true);

    try {
      // Delete from storage
      const urlParts = profilePicUrl.split("/");
      const fileName = urlParts.pop();
      if (fileName) {
        await supabase.storage
          .from("media")
          .remove([`profiles/${userId}/${fileName}`]);
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ profile_pic_url: null })
        .eq("id", userId);

      if (error) throw error;

      setProfilePicUrl(null);

      toast.success("Profile picture removed");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove—retry?", {
        action: {
          label: "Retry",
          onClick: handleRemoveProfilePic,
        },
      });
    } finally {
      setUploadingProfile(false);
    }
  };

  // Welcome audio handlers
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isMP3 = fileName.endsWith('.mp3');
    const isM4A = fileName.endsWith('.m4a');

    if (!isMP3 && !isM4A) {
      toast.error("Only MP3 and M4A files are allowed");
      e.target.value = '';
      return;
    }

    // 30 seconds max at ~128kbps = ~500KB, but allow up to 1MB for safety
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Audio file must be under 1MB (30 seconds max)");
      e.target.value = '';
      return;
    }

    setAudioFile(file);
  };

  const handleUploadAudio = async () => {
    if (!audioFile || !community) return;

    setUploadingAudio(true);

    try {
      const timestamp = Date.now();
      const filePath = `welcome-audio/${community.id}/${timestamp}_${audioFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, audioFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("communities")
        .update({ welcome_audio_url: publicUrl })
        .eq("id", community.id);

      if (updateError) throw updateError;

      setWelcomeAudioUrl(publicUrl);
      setAudioFile(null);
      toast.success("Welcome audio uploaded!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Upload failed—retry?", {
        action: {
          label: "Retry",
          onClick: handleUploadAudio,
        },
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleRemoveAudio = async () => {
    if (!community || !welcomeAudioUrl) return;

    setUploadingAudio(true);

    try {
      // Delete from storage
      const urlParts = welcomeAudioUrl.split("/");
      const fileName = urlParts.pop();
      if (fileName) {
        const filePath = `welcome-audio/${community.id}/${fileName}`;
        await supabase.storage
          .from("media")
          .remove([filePath]);
      }

      // Update community
      const { error } = await supabase
        .from("communities")
        .update({ welcome_audio_url: null })
        .eq("id", community.id);

      if (error) throw error;

      setWelcomeAudioUrl(null);
      toast.success("Welcome audio removed");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove audio—retry?", {
        action: {
          label: "Retry",
          onClick: handleRemoveAudio,
        },
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSave = async () => {
    if (!community) {
      toast.error("Please create a community first");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ theme_json: theme })
      .eq("id", community.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to save theme—retry?", {
        action: {
          label: "Retry",
          onClick: handleSave,
        },
      });
    } else {
      toast.success("Theme updated!");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!community) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme Customization</CardTitle>
          <CardDescription>Create a community first to customize its theme</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Theme Customization
        </CardTitle>
        <CardDescription>Customize your community's look and feel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture Upload */}
        <div className="space-y-3">
          <Label>Artist Profile Picture</Label>
          <div className="space-y-3">
            {profilePicUrl && (
              <div className="relative w-32 h-32 mx-auto">
                <img
                  src={profilePicUrl}
                  alt="Profile picture"
                  className="w-full h-full object-cover rounded-full border-4 border-primary shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 rounded-full"
                  onClick={handleRemoveProfilePic}
                  disabled={uploadingProfile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleProfilePicChange}
                disabled={uploadingProfile}
                className="flex-1"
              />
              <Button
                onClick={handleUploadProfilePic}
                disabled={!profilePicFile || uploadingProfile}
              >
                {uploadingProfile ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload JPG or PNG images, max 2MB. Circular preview shows on artist cards.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Primary Color</Label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setTheme({ ...theme, primaryColor: color.value })}
                className={`h-16 rounded-lg transition-all ${theme.primaryColor === color.value
                    ? "ring-2 ring-primary ring-offset-2"
                    : "hover:scale-105"
                  }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Secondary Color</Label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setTheme({ ...theme, secondaryColor: color.value })}
                className={`h-16 rounded-lg transition-all ${theme.secondaryColor === color.value
                    ? "ring-2 ring-primary ring-offset-2"
                    : "hover:scale-105"
                  }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Wallpaper Style</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {wallpapers.map((wallpaper) => (
              <button
                key={wallpaper.name}
                onClick={() => setTheme({ ...theme, wallpaper: wallpaper.value })}
                className={`h-20 rounded-lg border-2 transition-all flex items-center justify-center text-sm font-medium ${theme.wallpaper === wallpaper.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                  }`}
              >
                {wallpaper.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Upload Custom Wallpaper</Label>
          <div className="space-y-3">
            {wallpaperUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={wallpaperUrl}
                  alt="Community wallpaper"
                  className="w-full h-full object-cover"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveWallpaper}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={handleUploadWallpaper}
                disabled={!wallpaperFile || uploading}
              >
                {uploading ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload JPG or PNG images, max 5MB
            </p>
          </div>
        </div>

        {/* Welcome Audio Upload */}
        <div className="space-y-3">
          <Label>Welcome Audio Message</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Record a 30-second welcome message for new subscribers. This will play automatically after they join your community.
          </p>

          {/* Current Audio Preview */}
          {welcomeAudioUrl && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className="text-sm font-medium">Current Welcome Audio:</p>
              <audio controls className="w-full" src={welcomeAudioUrl}>
                Your browser does not support audio playback.
              </audio>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveAudio}
                disabled={uploadingAudio}
                className="w-full"
              >
                Remove Audio
              </Button>
            </div>
          )}

          {/* Upload New Audio */}
          <div className="flex gap-3">
            <Input
              type="file"
              accept=".mp3,.m4a"
              onChange={handleAudioChange}
              disabled={uploadingAudio}
              className="flex-1"
            />
            <Button
              onClick={handleUploadAudio}
              disabled={!audioFile || uploadingAudio}
            >
              {uploadingAudio ? (
                "Uploading..."
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            MP3 or M4A files, max 1MB (30 seconds)
          </p>
        </div>

        {/* Echo Track Upload - Hidden */}
        {false && (
          <div className="space-y-3 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              <Label>Echo Moments Track</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Upload a background track for fan Echo Moments. Select a 5-15 second clip that will play with their monthly highlights.
            </p>

            {/* Current Echo Track Preview */}
            {echoTrackUrl && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium">Current Echo Track:</p>
                <audio controls className="w-full" src={echoTrackUrl}>
                  Your browser does not support audio playback.
                </audio>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>Clip: {echoClipStart}s - {echoClipEnd}s</span>
                  <span>({echoClipEnd - echoClipStart}s duration)</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!community) return;
                    const { error } = await supabase
                      .from("communities")
                      .update({
                        echo_track_url: null,
                        echo_clip_start: null,
                        echo_clip_end: null
                      })
                      .eq("id", community.id);

                    if (!error) {
                      setEchoTrackUrl(null);
                      toast.success("Echo track removed");
                    }
                  }}
                  className="w-full"
                >
                  Remove Echo Track
                </Button>
              </div>
            )}

            {/* Upload New Echo Track */}
            <div className="space-y-3">
              <Input
                type="file"
                accept=".mp3,.m4a"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (!file.type.startsWith("audio/")) {
                    toast.error("Please upload an audio file");
                    return;
                  }

                  setEchoFile(file);
                }}
                disabled={uploadingEcho}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={echoClipStart}
                    onChange={(e) => setEchoClipStart(Number(e.target.value))}
                    disabled={uploadingEcho}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={echoClipEnd}
                    onChange={(e) => setEchoClipEnd(Number(e.target.value))}
                    disabled={uploadingEcho}
                  />
                </div>
              </div>
              <Button
                onClick={async () => {
                  if (!echoFile || !community) return;
                  setUploadingEcho(true);
                  // Upload logic here...
                  setUploadingEcho(false);
                }}
                disabled={!echoFile || uploadingEcho}
                className="w-full"
              >
                {uploadingEcho ? "Uploading..." : "Upload Track"}
              </Button>
            </div>
          </div>
        )}


        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </CardContent >
    </Card >
  );
};

export default ThemeCustomization;
