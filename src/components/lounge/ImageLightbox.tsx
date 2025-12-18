import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
}

const ImageLightbox = ({ open, onClose, imageUrl, altText = "Full size image" }: ImageLightboxProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-lg w-full h-full max-h-screen p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
