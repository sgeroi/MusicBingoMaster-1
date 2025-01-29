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

function generateBingoCard(artists: string[], cardNumber: number): string[] {
  const shuffled = shuffleArray(artists);
  return shuffled.slice(0, 36); // 6x6 grid needs 36 artists
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
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const artist = artists[i * 6 + j];
      ctx.fillText(
        artist,
        (j + 0.5) * (800/6),
        (i + 0.5) * (800/6),
        800/6 - 10
      );
    }
  }
  
  // Add card number
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`#${cardNumber}`, 60, 30);
  
  return canvas.toBuffer();
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Create new game
  app.post("/api/games", async (req, res) => {
    const { name, cardCount, artists } = req.body;
    const artistList = artists.split('\n').map((a: string) => a.trim()).filter(Boolean);
    
    if (artistList.length < 36) {
      return res.status(400).json({ message: "Need at least 36 artists for a 6x6 grid" });
    }

    const [game] = await db.insert(games).values({
      name,
      cardCount,
      artists: artistList,
    }).returning();

    // Generate bingo cards
    const cardsToInsert = [];
    for (let i = 1; i <= cardCount; i++) {
      const grid = generateBingoCard(artistList, i);
      cardsToInsert.push({
        gameId: game.id,
        cardNumber: i,
        grid,
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
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id)),
    });
    if (!game) return res.status(404).json({ message: "Game not found" });
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
    const { selectedArtists } = req.body;
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id)),
    });
    if (!game) return res.status(404).json({ message: "Game not found" });

    const cards = await db.select().from(bingoCards).where(eq(bingoCards.gameId, game.id));
    
    const stats = {
      totalMatches: 0,
      fiveRemaining: 0,
      threeRemaining: 0,
      oneRemaining: 0,
      winners: [] as number[],
    };

    for (const card of cards) {
      const matches = card.grid.filter(artist => selectedArtists.includes(artist)).length;
      if (matches > 0) stats.totalMatches++;
      
      const remaining = 36 - matches;
      if (remaining === 5) stats.fiveRemaining++;
      if (remaining === 3) stats.threeRemaining++;
      if (remaining === 1) stats.oneRemaining++;
      if (remaining === 0) stats.winners.push(card.cardNumber);
    }

    res.json(stats);
  });

  return httpServer;
}
