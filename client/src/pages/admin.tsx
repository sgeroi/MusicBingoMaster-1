import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

interface GameForm {
  name: string;
  cardCount: number;
  artists: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const form = useForm<GameForm>();
  
  const { data: games, refetch } = useQuery({
    queryKey: ["/api/games"],
  });

  const createGame = useMutation({
    mutationFn: async (data: GameForm) => {
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
    window.location.href = `/api/games/${gameId}/cards`;
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
              
              <Button type="submit" disabled={createGame.isPending}>
                Create Game
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Games List</CardTitle>
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
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Cards
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
