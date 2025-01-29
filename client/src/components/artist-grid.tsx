import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

interface ArtistGridProps {
  artists: string[];
  selectedArtists: string[];
  onArtistClick: (artist: string) => void;
}

export function ArtistGrid({ artists = [], selectedArtists, onArtistClick }: ArtistGridProps) {
  const sortedArtists = [...(artists || [])].sort();

  return (
    <ScrollArea className="h-[600px] w-full rounded-md border p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {sortedArtists.map((artist) => (
          <Button
            key={artist}
            variant="outline"
            className={cn(
              "h-auto py-2 px-4 text-left",
              selectedArtists.includes(artist) && "bg-primary text-primary-foreground"
            )}
            onClick={() => onArtistClick(artist)}
          >
            {artist}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}