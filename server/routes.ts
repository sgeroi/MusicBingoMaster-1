import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { games, bingoCards } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCanvas } from "canvas";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateBingoCard(artists: string[], cardNumber: number, hasHeart: boolean): string[] {
  // Randomly shuffle artists and take first 36 for the grid
  const shuffled = shuffleArray(artists);
  const grid = shuffled.slice(0, 36);

  // If hasHeart is true, add heart emoji to a random artist
  if (hasHeart) {
    const randomIndex = Math.floor(Math.random() * grid.length);
    grid[randomIndex] = `❤️ ${grid[randomIndex]}`;
    console.log(`Card ${cardNumber}: Added heart to artist at index ${randomIndex}: ${grid[randomIndex]}`);
  }

  return grid;
}

async function generateCardImage(artists: string[], cardNumber: number): Promise<Buffer> {
  const canvas = createCanvas(800, 800);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 800);

  // Grid lines
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (800/6), 0);
    ctx.lineTo(i * (800/6), 800);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * (800/6));
    ctx.lineTo(800, i * (800/6));
    ctx.stroke();
  }

  // Add artists
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const index = i * 6 + j;
      const artist = artists[index];
      if (artist) {
        const cellCenterX = (j + 0.5) * (800/6);
        const cellCenterY = (i + 0.5) * (800/6);

        // Draw artist name
        ctx.font = '16px Arial';
        // Разбиваем длинный текст на строки
        const words = artist.split(' ');
        let lines = [''];
        let currentLine = 0;

        words.forEach(word => {
          const testLine = lines[currentLine] + (lines[currentLine] ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 800/6 - 20) {
            currentLine++;
            lines[currentLine] = word;
          } else {
            lines[currentLine] = testLine;
          }
        });

        // Draw text lines
        const lineHeight = 20;
        const totalHeight = lines.length * lineHeight;
        const startY = cellCenterY;

        lines.forEach((line, lineIndex) => {
          const y = startY + (lineIndex * lineHeight) - (totalHeight / 2);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.strokeText(line, cellCenterX, y);
          ctx.fillStyle = 'black';
          ctx.fillText(line, cellCenterX, y);
        });
      }
    }
  }

  // Add card number
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(5, 5, 45, 25);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`#${cardNumber}`, 27, 22);

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Create new game
  app.post("/api/games", async (req, res) => {
    const { name, cardCount, artists, hasHeart } = req.body;
    console.log("Creating new game with hasHeart:", hasHeart);

    const artistList = artists.split('\n').map((a: string) => a.trim()).filter(Boolean);

    if (artistList.length < 36) {
      return res.status(400).json({ message: "Need at least 36 artists for a 6x6 grid" });
    }

    const [game] = await db.insert(games).values({
      name,
      cardCount,
      artists: artistList,
      hasHeart,
    }).returning();

    // Generate bingo cards
    const cardsToInsert = [];
    for (let i = 1; i <= cardCount; i++) {
      const grid = generateBingoCard(artistList, i, hasHeart);
      cardsToInsert.push({
        gameId: game.id,
        cardNumber: i,
        grid,
        heartPosition: null, // Больше не используется, так как сердечко добавляется к имени исполнителя
      });
    }

    await db.insert(bingoCards).values(cardsToInsert);

    res.json(game);
  });

  // Get all games
  app.get("/api/games", async (req, res) => {
    const allGames = await db.select().from(games);
    res.json(allGames);
  });

  // Get specific game
  app.get("/api/games/:id", async (req, res) => {
    console.log("Getting game with id:", req.params.id); // Debug log
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id)),
    });

    if (!game) {
      console.log("Game not found"); // Debug log
      return res.status(404).json({ message: "Game not found" });
    }

    console.log("Found game:", game); // Debug log
    res.json(game);
  });

  // Generate and download cards
  app.get("/api/games/:id/cards", async (req, res) => {
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id)),
    });
    if (!game) return res.status(404).json({ message: "Game not found" });

    const cards = await db.select().from(bingoCards).where(eq(bingoCards.gameId, game.id));

    const archive = archiver('zip');
    res.attachment(`bingo-cards-game-${game.id}.zip`);
    archive.pipe(res);

    for (const card of cards) {
      const imageBuffer = await generateCardImage(card.grid, card.cardNumber);
      archive.append(imageBuffer, { name: `card-${card.cardNumber}.jpg` });
    }

    await archive.finalize();
  });

  // Get game statistics
  app.post("/api/games/:id/stats", async (req, res) => {
    const { selectedArtists, excludedCards = [] } = req.body;
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id)),
    });
    if (!game) return res.status(404).json({ message: "Game not found" });

    const cards = await db.select().from(bingoCards).where(eq(bingoCards.gameId, game.id));

    // Информация по каждой карточке
    const cardStats = cards
      .filter(card => !excludedCards.includes(card.cardNumber)) // Исключаем карточки
      .map(card => {
        // Очищаем имена исполнителей от эмодзи сердечка для сравнения
        const cleanGrid = card.grid.map(artist => artist.replace('❤️ ', ''));
        const remaining = cleanGrid.filter(artist => !selectedArtists.includes(artist)).length;
        return {
          cardNumber: card.cardNumber,
          remainingCount: remaining,
          isComplete: remaining === 0
        };
      });

    // Сортируем карточки по количеству оставшихся исполнителей
    cardStats.sort((a, b) => a.remainingCount - b.remainingCount);

    const stats = {
      // Все карточки с количеством оставшихся исполнителей
      cards: cardStats.map(stat => ({
        cardNumber: stat.cardNumber,
        remaining: stat.remainingCount
      })),
      // Победители (все исполнители зачеркнуты)
      winners: cardStats
        .filter(stat => stat.isComplete)
        .map(stat => stat.cardNumber),
      // Общая статистика
      totalCards: cardStats.length
    };

    res.json(stats);
  });

  return httpServer;
}