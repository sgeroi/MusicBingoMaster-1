import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Play, Trash } from "lucide-react";

interface Game {
  id: number;
  name: string;
  cardCount: number;
  artists: string[];
  createdAt: string;
}

interface GameForm {
  name: string;
  cardCount: number;
  artists: string;
  hasHeart: boolean;
}

export default function CreateBingoPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const form = useForm<GameForm>({
    defaultValues: {
      name: "",
      cardCount: 1,
      artists: "",
      hasHeart: false
    }
  });

  const { data: games, refetch } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const createGame = useMutation({
    mutationFn: async (data: GameForm) => {
      const formData = {
        ...data,
        hasHeart: !!data.hasHeart,
      };
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Created",
        description: "The bingo game was created successfully.",
      });
      form.reset();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create game",
        variant: "destructive",
      });
    },
  });

  const deleteGame = useMutation({
    mutationFn: async (gameId: number) => {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Game deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete game",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data: GameForm) => {
    createGame.mutate(data);
  });

  const handleStartGame = (gameId: number) => {
    navigate(`/?gameId=${gameId}`);
  };

  const handleDeleteGame = async (gameId: number) => {
    try {
      setDeleting(gameId);
      await deleteGame.mutateAsync(gameId);
    } finally {
      setDeleting(null);
    }
  };

  const downloadCards = async (gameId: number) => {
    try {
      setDownloading(gameId);
      const response = await fetch(`/api/games/${gameId}/cards`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bingo-cards-game-${gameId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Cards downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download cards",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Bingo Game</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Game Name"
                  {...form.register("name", { required: true })}
                />
              </div>

              <div>
                <Input
                  type="number"
                  placeholder="Number of Cards"
                  min="1"
                  {...form.register("cardCount", { 
                    required: true,
                    valueAsNumber: true,
                    min: 1 
                  })}
                />
              </div>

              <div>
                <Textarea
                  placeholder="Enter artists (one per line)"
                  className="min-h-[200px]"
                  {...form.register("artists", { required: true })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHeart"
                  {...form.register("hasHeart")}
                />
                <label
                  htmlFor="hasHeart"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Add random heart to each card
                </label>
              </div>

              <Button type="submit" disabled={createGame.isPending}>
                Create Game
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Games</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Cards</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games?.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.id}</TableCell>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>{game.cardCount}</TableCell>
                    <TableCell>
                      {new Date(game.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStartGame(game.id)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Game
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCards(game.id)}
                          disabled={downloading === game.id}
                        >
                          {downloading === game.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          {downloading === game.id ? 'Downloading...' : 'Download'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteGame(game.id)}
                          disabled={deleting === game.id}
                        >
                          {deleting === game.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash className="w-4 h-4 mr-2" />
                          )}
                          {deleting === game.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}