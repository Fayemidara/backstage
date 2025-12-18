import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SeedData = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);

  const addStatus = (message: string) => {
    setStatus((prev) => [...prev, message]);
  };

  const seedTestData = async () => {
    setLoading(true);
    setStatus([]);
    
    try {
      addStatus("Starting seed process...");

      const testUsers = [
        {
          email: "artist1@test.com",
          password: "password123",
          username: "artist1",
          role: "artist",
          bio: "Indie musician sharing behind the scenes content.",
          verified: true,
          community: {
            name: "Artist1 Backstage",
            description: "Join for exclusive drops and behind the scenes content.",
            price: 10.00
          }
        },
        {
          email: "artist2@test.com",
          password: "password123",
          username: "artist2",
          role: "artist",
          bio: "Pop star with exclusive drops and content.",
          verified: true,
          community: {
            name: "Artist2 Backstage",
            description: "Behind the scenes access to my creative process.",
            price: 15.00
          }
        },
        {
          email: "artist3@test.com",
          password: "password123",
          username: "artist3",
          role: "artist",
          bio: "Upcoming rapper making waves.",
          verified: false
        },
        {
          email: "fan1@test.com",
          password: "password123",
          username: "fan1",
          role: "fan",
          bio: "Music lover and supporter."
        },
        {
          email: "fan2@test.com",
          password: "password123",
          username: "fan2",
          role: "fan",
          bio: "Concert enthusiast."
        }
      ];

      const createdUsers: any[] = [];

      for (const user of testUsers) {
        addStatus(`Creating user ${user.username}...`);
        
        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              username: user.username,
              role: user.role
            }
          }
        });

        if (error) {
          if (error.message.includes("already registered")) {
            addStatus(`User ${user.username} already exists, skipping...`);
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("username", user.username)
              .maybeSingle();
            
            if (existingProfile) {
              createdUsers.push({ ...user, id: existingProfile.id });
            }
          } else {
            throw error;
          }
        } else if (data.user) {
          createdUsers.push({ ...user, id: data.user.id });
          addStatus(`✓ Created ${user.username}`);
          
          await supabase
            .from("profiles")
            .update({ 
              bio: user.bio,
              verified: user.verified || false,
              first_login: false
            })
            .eq("id", data.user.id);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      addStatus("Creating communities...");
      for (const user of createdUsers) {
        if (user.role === "artist" && user.community) {
          const { error } = await supabase
            .from("communities")
            .insert({
              artist_id: user.id,
              name: user.community.name,
              description: user.community.description,
              subscription_price: user.community.price
            });

          if (error && !error.message.includes("duplicate")) {
            console.error(`Error creating community for ${user.username}:`, error);
          } else {
            addStatus(`✓ Created community for ${user.username}`);
          }
        }
      }

      addStatus("Creating test subscription...");
      const fan1 = createdUsers.find(u => u.username === "fan1");
      const artist1 = createdUsers.find(u => u.username === "artist1");
      
      if (fan1 && artist1) {
        const { data: community } = await supabase
          .from("communities")
          .select("id")
          .eq("artist_id", artist1.id)
          .maybeSingle();

        if (community) {
          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: fan1.id,
              artist_id: artist1.id,
              community_id: community.id,
              status: "active"
            });

          if (error && !error.message.includes("duplicate")) {
            console.error("Error creating subscription:", error);
          } else {
            addStatus("✓ Created subscription: fan1 → artist1");
          }
        }
      }

      addStatus("✓ Seed completed successfully!");
      toast({
        title: "Success!",
        description: "Test data has been seeded successfully.",
      });

    } catch (error: any) {
      console.error("Seed error:", error);
      addStatus(`✗ Error: ${error.message}`);
      toast({
        title: "Error",
        description: "Failed to seed test data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Seed Test Data</h1>
          <p className="text-muted-foreground">
            Create test users, artists, communities, and subscriptions for development.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Test Users</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Artists:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>artist1@test.com / password123 (verified, $10/mo community)</li>
              <li>artist2@test.com / password123 (verified, $15/mo community)</li>
              <li>artist3@test.com / password123 (not verified, no community)</li>
            </ul>
            <p className="mt-2"><strong>Fans:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>fan1@test.com / password123 (subscribed to artist1)</li>
              <li>fan2@test.com / password123</li>
            </ul>
          </div>

          <Button
            onClick={seedTestData}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding...
              </>
            ) : (
              "Seed Test Data"
            )}
          </Button>
        </div>

        {status.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Status Log</h2>
            <div className="space-y-1 font-mono text-xs">
              {status.map((msg, i) => (
                <div key={i} className="text-muted-foreground">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeedData;
