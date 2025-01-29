import { Card, CardContent } from "./ui/card";

interface CardProgress {
  cardNumber: number;
  remaining: number;
}

interface GameStats {
  closeToWin: CardProgress[];
  winners: number[];
  totalCards: number;
  averageRemaining: number;
}

export function GameStats({ stats }: { stats: GameStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalCards}</div>
          <div className="text-muted-foreground">Всего карточек</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.averageRemaining}</div>
          <div className="text-muted-foreground">Среднее кол-во оставшихся</div>
        </CardContent>
      </Card>

      {stats.closeToWin.length > 0 && (
        <Card className="col-span-2 bg-yellow-50 dark:bg-yellow-900">
          <CardContent className="pt-6">
            <div className="text-xl font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
              Близки к победе:
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.closeToWin.map(({ cardNumber, remaining }) => (
                <span key={cardNumber} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                  Бланк #{cardNumber} (осталось {remaining})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.winners.length > 0 && (
        <Card className="col-span-full bg-green-50 dark:bg-green-900">
          <CardContent className="pt-6">
            <div className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
              Победители:
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.winners.map((cardNumber) => (
                <span key={cardNumber} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                  Бланк #{cardNumber}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}