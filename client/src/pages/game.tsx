import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { GameStats } from "@/components/game-stats";
import { ArtistGrid } from "@/components/artist-grid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [selectedGame, setSelectedGame] = useState<string>();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [excludedCards, setExcludedCards] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGameData, setNewGameData] = useState({
    name: "",
    cardCount: 1,
    artists: "",
    hasHeart: false
  });

  const { data: games, refetch } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: currentGame } = useQuery<Game>({
    queryKey: [`/api/games/${selectedGame}`],
    enabled: !!selectedGame,
  });

  const createGame = useMutation({
    mutationFn: async (data: typeof newGameData) => {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Game created successfully",
      });
      setCreateDialogOpen(false);
      refetch();
      setNewGameData({
        name: "",
        cardCount: 1,
        artists: "",
        hasHeart: false
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create game",
        variant: "destructive",
      });
    },
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

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    createGame.mutate(newGameData);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Music Bingo Game</CardTitle>
            <div className="flex gap-4">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Create New Game</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Game</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateGame} className="space-y-4">
                    <Input
                      placeholder="Game Name"
                      value={newGameData.name}
                      onChange={(e) => setNewGameData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Number of Cards"
                      min="1"
                      value={newGameData.cardCount}
                      onChange={(e) => setNewGameData(prev => ({ ...prev, cardCount: parseInt(e.target.value) }))}
                      required
                    />
                    <Textarea
                      placeholder="Enter artists (one per line)"
                      value={newGameData.artists}
                      onChange={(e) => setNewGameData(prev => ({ ...prev, artists: e.target.value }))}
                      className="min-h-[200px]"
                      required
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasHeart"
                        checked={newGameData.hasHeart}
                        onCheckedChange={(checked) => 
                          setNewGameData(prev => ({ ...prev, hasHeart: checked as boolean }))
                        }
                      />
                      <label
                        htmlFor="hasHeart"
                        className="text-sm font-medium leading-none"
                      >
                        Add random heart to each card
                      </label>
                    </div>
                    <Button type="submit" disabled={createGame.isPending}>
                      {createGame.isPending ? "Creating..." : "Create Game"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

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
          </CardHeader>
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