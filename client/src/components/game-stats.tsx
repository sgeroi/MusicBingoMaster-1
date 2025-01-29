import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CardProgress {
  cardNumber: number;
  remaining: number;
  completedLines: number;
  grid: string[];
  crossedOut: boolean[];
}

interface GameStats {
  cards: CardProgress[];
  winners: number[];
  lineWinners: { cardNumber: number; lines: number }[];
  totalCards: number;
}

function CardPreview({ card }: { card: CardProgress }) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {card.grid.map((artist, index) => (
        <div
          key={index}
          className={`p-2 text-xs text-center border rounded ${
            card.crossedOut[index]
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
              : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100"
          }`}
        >
          {artist}
        </div>
      ))}
    </div>
  );
}

export function GameStats({ stats }: { stats: GameStats }) {
  return (
    <div className="grid gap-4 mb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalCards}</div>
          <div className="text-muted-foreground">Всего карточек в игре</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xl font-semibold mb-4">Статус карточек:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {stats.cards.map((card) => (
              <Dialog key={card.cardNumber}>
                <DialogTrigger asChild>
                  <div
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
                      card.remaining === 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : card.completedLines > 0
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                    }`}
                  >
                    <div className="font-medium">Бланк #{card.cardNumber}</div>
                    <div className="text-sm">
                      {card.remaining === 0
                        ? "Победа!"
                        : `Осталось: ${card.remaining}`}
                    </div>
                    {card.completedLines > 0 && (
                      <div className="text-sm font-semibold mt-1">
                        Собрано линий: {card.completedLines}
                      </div>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Бланк #{card.cardNumber}
                      {card.completedLines > 0 && ` (${card.completedLines} линий)`}
                    </DialogTitle>
                  </DialogHeader>
                  <CardPreview card={card} />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}