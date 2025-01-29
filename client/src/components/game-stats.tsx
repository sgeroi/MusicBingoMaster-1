import { Card, CardContent } from "./ui/card";

interface CardProgress {
  cardNumber: number;
  remaining: number;
}

interface GameStats {
  cards: CardProgress[];
  winners: number[];
  totalCards: number;
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
            {stats.cards.map(({ cardNumber, remaining }) => (
              <div
                key={cardNumber}
                className={`p-3 rounded-lg ${
                  remaining === 0
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                <div className="font-medium">Бланк #{cardNumber}</div>
                <div className="text-sm">
                  {remaining === 0
                    ? "Победа!"
                    : `Осталось: ${remaining}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}