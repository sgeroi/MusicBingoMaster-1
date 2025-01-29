import { Card, CardContent } from "./ui/card";

interface GameStats {
  totalMatches: number;
  fiveRemaining: number;
  threeRemaining: number;
  oneRemaining: number;
  winners: number[];
}

export function GameStats({ stats }: { stats: GameStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalMatches}</div>
          <div className="text-muted-foreground">Total Matches</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.fiveRemaining}</div>
          <div className="text-muted-foreground">5 Remaining</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.threeRemaining}</div>
          <div className="text-muted-foreground">3 Remaining</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.oneRemaining}</div>
          <div className="text-muted-foreground">1 Remaining</div>
        </CardContent>
      </Card>

      {stats.winners.length > 0 && (
        <Card className="col-span-full bg-green-50 dark:bg-green-900">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              Winner{stats.winners.length > 1 ? 's' : ''}: Card #{stats.winners.join(', #')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
