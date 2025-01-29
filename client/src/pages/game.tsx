import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStats } from "@/components/game-stats";
import { ArtistGrid } from "@/components/artist-grid";

export default function GamePage() {
  const [selectedGame, setSelectedGame] = useState<string>();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  const { data: games } = useQuery({
    queryKey: ["/api/games"],
  });

  const { data: currentGame } = useQuery({
    queryKey: ["/api/games", selectedGame],
    enabled: !!selectedGame,
  });

  const { data: gameStats, mutate: updateStats } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${selectedGame}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedArtists }),
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

  const startGame = () => {
    setSelectedArtists([]);
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
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {games?.map((game: any) => (
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
