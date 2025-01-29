import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameStats } from "@/components/game-stats";
import { ArtistGrid } from "@/components/artist-grid";
import { useToast } from "@/hooks/use-toast";

interface Game {
  id: number;
  name: string;
  cardCount: number;
  artists: string[];
  status: string;
  createdAt: string;
}

export default function GamePage() {
  const { toast } = useToast();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [excludedCards, setExcludedCards] = useState<string>("");

  // Get game ID from URL
  const gameId = window.location.pathname.split('/').pop();

  const { data: currentGame } = useQuery<Game>({
    queryKey: [`/api/games/${gameId}`],
    enabled: !!gameId,
  });

  const { data: gameStats, mutate: updateStats } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          selectedArtists,
          excludedCards: excludedCards.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n))
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const handleArtistClick = (artist: string) => {
    setSelectedArtists((prev) => {
      const newSelection = prev.includes(artist)
        ? prev.filter((a) => a !== artist)
        : [...prev, artist];

      if (gameId) {
        updateStats();
      }

      return newSelection;
    });
  };

  const handleExcludedCardsChange = (value: string) => {
    setExcludedCards(value);
    if (gameId) {
      updateStats();
    }
  };

  if (!currentGame) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Настройки игры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Исключить карточки (номера через запятую)
                </label>
                <Input
                  placeholder="например: 1, 4, 7"
                  value={excludedCards}
                  onChange={(e) => handleExcludedCardsChange(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {gameStats && <GameStats stats={gameStats} />}

        <Card>
          <CardHeader>
            <CardTitle>Выберите исполнителей</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistGrid
              artists={currentGame.artists}
              selectedArtists={selectedArtists}
              onArtistClick={handleArtistClick}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}