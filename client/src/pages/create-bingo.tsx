import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";

interface GameForm {
  name: string;
  cardCount: number;
  artists: string;
  hasHeart: boolean;
}

export default function CreateBingoPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<number | null>(null);

  const form = useForm<GameForm>({
    defaultValues: {
      hasHeart: false
    }
  });

  const { data: games, refetch } = useQuery({
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
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    createGame.mutate(data);
  });

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
                {games?.map((game: any) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.id}</TableCell>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>{game.cardCount}</TableCell>
                    <TableCell>
                      {new Date(game.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
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
                        {downloading === game.id ? 'Downloading...' : 'Download Cards'}
                      </Button>
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
