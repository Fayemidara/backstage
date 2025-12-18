import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Shield } from "lucide-react";

interface SubscriptionSettingsProps {
  userId: string;
}

const SubscriptionSettings = ({ userId }: SubscriptionSettingsProps) => {
  const { toast } = useToast();
  const [community, setCommunity] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [formData, setFormData] = useState({
    price: "10",
    description: "",
    bio: "",
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // Fetch community
    const { data: communityData } = await supabase
      .from("communities")
      .select("*")
      .eq("artist_id", userId)
      .maybeSingle();

    if (communityData) {
      setCommunity(communityData);
      setFormData((prev) => ({
        ...prev,
        price: communityData.subscription_price?.toString() || "10",
        description: communityData.description || "",
      }));
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
      setFormData((prev) => ({
        ...prev,
        bio: profileData.bio || "",
      }));
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!community) {
      toast({
        title: "No Community",
        description: "Please create a community first",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 5 || price > 25) {
      toast({
        title: "Invalid Price",
        description: "Price must be between $5 and $25",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    // Update community
    const { error: communityError } = await supabase
      .from("communities")
      .update({
        subscription_price: price,
        description: formData.description,
      })
      .eq("id", community.id);

    // Update profile bio
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ bio: formData.bio })
      .eq("id", userId);

    setSaving(false);

    if (communityError || profileError) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });
    }
  };

  const handleRequestVerification = async () => {
    setRequestingVerification(true);
    
    // Verification is now handled through the verifications table
    toast({
      title: "Info",
      description: "Please contact support to request verification",
    });

    setRequestingVerification(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Subscription Settings
          </CardTitle>
          <CardDescription>Manage your pricing and community details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">Monthly Price ($5-$25)</Label>
            <Input
              id="price"
              type="number"
              min="5"
              max="25"
              step="1"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Community Description</Label>
            <Textarea
              id="description"
              placeholder="What will subscribers get access to?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Artist Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell fans about yourself..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !community}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Verification
          </CardTitle>
          <CardDescription>
            Get verified to show authenticity to your fans
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.verification_status === "verified" ? (
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="w-5 h-5" />
              <span className="font-medium">You are verified!</span>
            </div>
          ) : profile?.verification_status === "pending" ? (
            <div className="text-yellow-600">
              <p className="font-medium">Verification pending</p>
              <p className="text-sm mt-1">Your request is under review</p>
            </div>
          ) : (
            <Button
              onClick={handleRequestVerification}
              disabled={requestingVerification}
              variant="outline"
            >
              {requestingVerification ? "Requesting..." : "Request Verification"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSettings;
