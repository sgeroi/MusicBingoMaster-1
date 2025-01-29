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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

interface Game {
  id: number;
  name: string;
  cardCount: number;
  artists: string[];
  createdAt: string;
}

interface Template {
  id: number;
  name: string;
  imagePath: string;
  isDefault: boolean;
}

interface GameForm {
  name: string;
  cardCount: number;
  artists: string;
  hasHeart: boolean;
  templateId: number;
}

export default function CreateBingoPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<GameForm>({
    defaultValues: {
      name: "",
      cardCount: 1,
      artists: "",
      hasHeart: false,
      templateId: 1 // Default template ID
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
        title: "Успех",
        description: "Игра успешно создана",
      });
      form.reset();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать игру",
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
        title: "Успех",
        description: "Игра успешно удалена",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось удалить игру",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data: GameForm) => {
    createGame.mutate(data);
  });

  const handleStartGame = (gameId: number) => {
    navigate(`/game/${gameId}`);
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
        title: "Успех",
        description: "Карточки успешно скачаны",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось скачать карточки",
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
            <CardTitle>Создать новую игру бинго</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Название игры"
                  {...form.register("name", { required: true })}
                />
              </div>

              <div>
                <Input
                  type="number"
                  placeholder="Количество карточек"
                  min="1"
                  {...form.register("cardCount", {
                    required: true,
                    valueAsNumber: true,
                    min: 1
                  })}
                />
              </div>

              <div>
                <Select
                  onValueChange={(value) => form.setValue("templateId", parseInt(value))}
                  defaultValue={String(form.getValues("templateId"))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name} {template.isDefault && "(основной)"}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Textarea
                  placeholder="Введите исполнителей (по одному в строке)"
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
                  Добавить случайное сердечко на каждую карточку
                </label>
              </div>

              <Button type="submit" disabled={createGame.isPending}>
                {createGame.isPending ? "Создание..." : "Создать игру"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ваши игры</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Карточки</TableHead>
                  <TableHead>Создано</TableHead>
                  <TableHead>Действия</TableHead>
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
                          Запустить
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
                          {downloading === game.id ? 'Скачивание...' : 'Скачать'}
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
                          {deleting === game.id ? 'Удаление...' : 'Удалить'}
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