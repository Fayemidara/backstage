import { User, Music2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RoleSelectionProps {
    onSelect: (role: "fan" | "artist") => void;
}

export const RoleSelection = ({ onSelect }: RoleSelectionProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
            <Card
                className="p-6 cursor-pointer hover:border-primary transition-all hover:scale-105 group bg-card/50 backdrop-blur-sm border-white/10"
                onClick={() => onSelect("fan")}
            >
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <User className="w-12 h-12 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">I'm a Fan</h3>
                        <p className="text-muted-foreground">
                            Join communities, listen to exclusive drops, and support your favorite artists.
                        </p>
                    </div>
                </div>
            </Card>

            <Card
                className="p-6 cursor-pointer hover:border-primary transition-all hover:scale-105 group bg-card/50 backdrop-blur-sm border-white/10"
                onClick={() => onSelect("artist")}
            >
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Music2 className="w-12 h-12 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">I'm an Artist</h3>
                        <p className="text-muted-foreground">
                            Build your community, share exclusive content, and monetize your passion.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};
