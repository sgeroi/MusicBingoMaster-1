import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GameStats } from "@/components/game-stats";
import { ArtistGrid } from "@/components/artist-grid";

interface Game {
  id: number;
  name: string;
  cardCount: number;
  artists: string[];
  status: string;
  createdAt: string;
}

export default function GamePage() {
  const [selectedGame, setSelectedGame] = useState<string>();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [excludedCards, setExcludedCards] = useState<string>("");

  const { data: games } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: currentGame } = useQuery<Game>({
    queryKey: [`/api/games/${selectedGame}`],
    enabled: !!selectedGame,
  });

  const { data: gameStats, mutate: updateStats } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${selectedGame}/stats`, {
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

      // Update stats after selection changes
      if (selectedGame) {
        updateStats();
      }

      return newSelection;
    });
  };

  const handleExcludedCardsChange = (value: string) => {
    setExcludedCards(value);
    if (selectedGame) {
      updateStats();
    }
  };

  const startGame = () => {
    setSelectedArtists([]);
    setExcludedCards("");
    setGameStarted(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Music Bingo Game</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Select
                value={selectedGame}
                onValueChange={(value) => {
                  setSelectedGame(value);
                  setGameStarted(false);
                  setSelectedArtists([]);
                  setExcludedCards("");
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {games?.map((game) => (
                    <SelectItem key={game.id} value={String(game.id)}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedGame && !gameStarted && (
                <Button onClick={startGame}>
                  Start Game
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedGame && gameStarted && currentGame && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Game Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Exclude Cards (comma-separated numbers)
                    </label>
                    <Input
                      placeholder="e.g. 1, 4, 7"
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
                <CardTitle>Select Called Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <ArtistGrid
                  artists={currentGame.artists}
                  selectedArtists={selectedArtists}
                  onArtistClick={handleArtistClick}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}