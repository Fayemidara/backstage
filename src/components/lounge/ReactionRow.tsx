import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

interface ReactionRowProps {
  postId: string;
  reactions: Record<string, number> | any;
}

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "🔥", "🎵"];

const ReactionRow = ({ postId, reactions }: ReactionRowProps) => {
  const { toast } = useToast();
  const [localReactions, setLocalReactions] = useState(reactions || {});
  const [showPicker, setShowPicker] = useState(false);

  // Guard against null/undefined postId
  if (!postId) {
    return null;
  }

  useEffect(() => {
    setLocalReactions(reactions || {});
  }, [reactions]);

  const handleReaction = async (emoji: string) => {
    const currentCount = localReactions[emoji] || 0;
    const newReactions = {
      ...localReactions,
      [emoji]: currentCount + 1,
    };

    // Optimistic update
    setLocalReactions(newReactions);
    setShowPicker(false);

    // Update in database
    const { error } = await supabase
      .from("posts")
      .update({ reactions: newReactions })
      .eq("id", postId);

    if (error) {
      // Revert on error
      setLocalReactions(localReactions);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Display existing reactions */}
      {Object.entries(localReactions)
        .filter(([_, count]) => typeof count === 'number' && count > 0)
        .map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-sm border border-border"
          >
            <span>{emoji}</span>
            <span className="text-xs font-medium">{count as number}</span>
          </button>
        ))}

      {/* Add reaction button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-secondary"
          onClick={() => setShowPicker(!showPicker)}
        >
          <Smile className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Emoji picker */}
        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-xl shadow-lg p-2 flex gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-2 hover:bg-secondary rounded-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReactionRow;