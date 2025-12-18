import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Music, ShoppingBag, Megaphone, Sparkles, Ticket, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommunityOverviewProps {
  userId: string;
}

const rooms = [
  { name: "Lounge", icon: MessageSquare, type: "lounge", description: "General chat with fans" },
  { name: "Music Drop", icon: Music, type: "music-drop", description: "Share exclusive tracks" },
  { name: "Merch Drop", icon: ShoppingBag, type: "merch-drop", description: "Exclusive merchandise" },
  { name: "Announcements", icon: Megaphone, type: "announcements", description: "Important updates" },
  { name: "Ticket Drop", icon: Ticket, type: "ticket-drop", description: "Exclusive event tickets" },
];

const CommunityOverview = ({ userId }: CommunityOverviewProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [blendSettings, setBlendSettings] = useState({
    blend_active: false,
    blend_link: "",
  });

  useEffect(() => {
    fetchCommunity();
  }, [userId]);

  const fetchCommunity = async () => {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("artist_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching community:", error);
    } else if (data) {
      setCommunity(data);
      setFormData({
        name: data.name,
        description: data.description || "",
      });
      setBlendSettings({
        blend_active: data.blend_active || false,
        blend_link: data.blend_link || "",
      });
    }
    setLoading(false);
  };

  const handleCreateCommunity = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a community name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("communities")
      .insert({
        artist_id: userId,
        name: formData.name,
        description: formData.description,
        subscription_price: 10, // Default price
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create community",
        variant: "destructive",
      });
    } else {
      setCommunity(data);
      setSetupMode(false);
      toast({
        title: "Success",
        description: "Community created successfully!",
      });
    }
  };

  const handleBlendToggle = async (enabled: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ 
        blend_active: enabled,
        blend_link: enabled ? blendSettings.blend_link : null,
        blend_full_at: null, // Reset full status when toggling
      })
      .eq("id", community.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update Blend settings",
        variant: "destructive",
      });
    } else {
      setBlendSettings({ ...blendSettings, blend_active: enabled });
      toast({
        title: "Success",
        description: enabled ? "Spotify Blend enabled!" : "Spotify Blend disabled",
      });
      fetchCommunity();
    }
  };

  const handleBlendLinkUpdate = async () => {
    if (!blendSettings.blend_link.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Spotify Blend link",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ blend_link: blendSettings.blend_link })
      .eq("id", community.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update Blend link",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Blend link updated!",
      });
      fetchCommunity();
    }
  };

  const handleMarkBlendFull = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ blend_full_at: new Date().toISOString() })
      .eq("id", community.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark Blend as full",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Blend marked as full (will linger 24h)",
      });
      fetchCommunity();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!community && !setupMode) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <CardTitle>Create Your Community</CardTitle>
          <CardDescription>
            Set up your exclusive community space to connect with your fans
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => setSetupMode(true)} size="lg">
            Get Started
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (setupMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Setup</CardTitle>
          <CardDescription>Create your exclusive community space</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Community Name</Label>
            <Input
              id="name"
              placeholder="e.g., Artist Name Backstage"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell fans what they'll get in your community..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateCommunity} disabled={saving}>
              {saving ? "Creating..." : "Create Community"}
            </Button>
            <Button variant="outline" onClick={() => setSetupMode(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{community.name}</CardTitle>
          <CardDescription>{community.description}</CardDescription>
        </CardHeader>
      </Card>

      {/* Spotify Blend Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" />
            Spotify Blend (Optional)
          </CardTitle>
          <CardDescription>
            Enable Spotify Blend to let fans join an exclusive shared playlist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="blend-toggle">Enable Spotify Blend</Label>
              <p className="text-xs text-muted-foreground">
                Show Blend tile in your community
              </p>
            </div>
            <Switch
              id="blend-toggle"
              checked={blendSettings.blend_active}
              onCheckedChange={handleBlendToggle}
              disabled={saving}
            />
          </div>

          {blendSettings.blend_active && (
            <>
              <div className="space-y-2">
                <Label htmlFor="blend-link">Spotify Blend Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="blend-link"
                    placeholder="https://spotify.link/..."
                    value={blendSettings.blend_link}
                    onChange={(e) =>
                      setBlendSettings({ ...blendSettings, blend_link: e.target.value })
                    }
                  />
                  <Button onClick={handleBlendLinkUpdate} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste your Spotify Blend invite link here
                </p>
              </div>

              <div className="space-y-2">
                <Label>Blend Status</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleMarkBlendFull}
                    disabled={saving || (community.blend_full_at !== null)}
                  >
                    {community.blend_full_at ? "Marked as Full" : "Mark as Full"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mark the Blend as full when limit is reached (will linger 24h)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.slice(0, 4).map((room) => {
          const Icon = room.icon;
          return (
            <Card 
              key={room.name} 
              className="hover:border-primary transition-colors cursor-pointer bg-gradient-to-br from-primary/20 to-background"
              onClick={() => navigate(`/community/${community.id}/${room.type}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <CardDescription>{room.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
      
      {/* Bottom Row - Ticket Drop and optional Spotify Blend */}
      <div className={`grid ${community.blend_active ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        <Card 
          className="hover:border-primary transition-colors cursor-pointer bg-gradient-to-br from-primary/20 to-background"
          onClick={() => navigate(`/community/${community.id}/ticket-drop`)}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Ticket Drop</CardTitle>
                <CardDescription>Exclusive event tickets</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {community.blend_active && (
          <Card 
            className="hover:border-primary transition-colors cursor-pointer bg-gradient-to-br from-primary/20 to-background"
            onClick={() => navigate(`/community/${community.id}/spotify-blend`)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Spotify Blend</CardTitle>
                  <CardDescription>Join the exclusive playlist</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CommunityOverview;
