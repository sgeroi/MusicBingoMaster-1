import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { db } from "@db";
import { games, bingoCards } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCanvas, loadImage } from "canvas";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";

// Storage for used combinations in current game
const usedCombinations = new Set<string>();

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateBingoCard(artists: string[], cardNumber: number, hasHeart: boolean): string[] {
  let grid: string[];
  let gridKey: string;

  do {
    const shuffled = shuffleArray(artists);
    grid = shuffled.slice(0, 36);
    gridKey = grid.sort().join(',');
  } while (usedCombinations.has(gridKey));

  usedCombinations.add(gridKey);
  grid = shuffleArray(grid);

  if (hasHeart) {
    const randomIndex = Math.floor(Math.random() * grid.length);
    grid[randomIndex] = `❤️ ${grid[randomIndex]} ❤️`;
  }

  return grid;
}

async function generateCardImage(artists: string[], cardNumber: number): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'attached_assets', 'bez_kletok.png');

  try {
    await fs.access(templatePath);
  } catch (error) {
    console.error('Template file not found:', templatePath);
    throw new Error('Template file not found');
  }

  const template = await loadImage(templatePath);
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(template, 0, 0);

  const gridStartX = template.width * 0.1;
  const gridStartY = template.height * 0.25;
  const gridWidth = template.width * 0.8;
  const gridHeight = template.height * 0.6;

  const cellWidth = gridWidth / 6;
  const cellHeight = gridHeight / 6;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const index = i * 6 + j;
      const artist = artists[index];
      if (artist) {
        const cellCenterX = gridStartX + (j + 0.5) * cellWidth;
        const cellCenterY = gridStartY + (i + 0.5) * cellHeight;

        const words = artist.split(' ');
        let lines = [''];
        let currentLine = 0;

        ctx.font = 'bold 32px Arial';
        words.forEach(word => {
          const testLine = lines[currentLine] + (lines[currentLine] ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > cellWidth - 20) {
            currentLine++;
            lines[currentLine] = word;
          } else {
            lines[currentLine] = testLine;
          }
        });

        const lineHeight = 36;
        const totalHeight = lines.length * lineHeight;
        const textStartY = cellCenterY - (totalHeight / 2);

        lines.forEach((line, lineIndex) => {
          const y = textStartY + lineIndex * lineHeight;
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 4;
          ctx.strokeText(line, cellCenterX, y);
          ctx.fillStyle = 'black';
          ctx.fillText(line, cellCenterX, y);
        });
      }
    }
  }

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  const numberX = template.width * 0.85;
  const numberY = template.height * 0.12;
  ctx.fillText(`${cardNumber}`, numberX, numberY);

  return canvas.toBuffer();
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    verifyClient: (info) => {
      // Skip Vite HMR WebSocket connections
      return info.req.headers['sec-websocket-protocol'] !== 'vite-hmr';
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      console.log('Received:', message);
    });
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Create new game
  app.post("/api/games", async (req, res) => {
    const { name, cardCount, artists, hasHeart } = req.body;

    const artistList = artists.split('\n').map((a: string) => a.trim()).filter(Boolean);

    if (artistList.length < 36) {
      return res.status(400).json({ message: "Need at least 36 artists for a 6x6 grid" });
    }

    usedCombinations.clear();

    const [game] = await db.insert(games).values({
      name,
      cardCount,
      artists: artistList,
      hasHeart: !!hasHeart,
    }).returning();

    const cardsToInsert = [];
    for (let i = 1; i <= cardCount; i++) {
      const grid = generateBingoCard(artistList, i, !!hasHeart);
      cardsToInsert.push({
        gameId: game.id,
        cardNumber: i,
        grid,
        heartPosition: null,
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

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json(game);
  });

  // Generate and download cards
  app.get("/api/games/:id/cards", async (req, res) => {
    console.log('Starting cards download for game:', req.params.id);

    try {
      const game = await db.query.games.findFirst({
        where: eq(games.id, parseInt(req.params.id)),
      });

      if (!game) {
        console.error('Game not found:', req.params.id);
        return res.status(404).json({ message: "Game not found" });
      }

      const cards = await db.select().from(bingoCards).where(eq(bingoCards.gameId, game.id));
      console.log('Found cards:', cards.length);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=bingo-cards-game-${game.id}.zip`);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        console.error('Archiver error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error creating archive" });
        }
      });

      archive.on('end', () => {
        console.log('Archive finalized successfully');
        // Notify all clients that generation is complete
        wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN is 1
            client.send(JSON.stringify({
              type: 'cardGeneration',
              gameId: game.id,
              progress: 100,
              status: 'complete'
            }));
          }
        });
      });

      archive.pipe(res);

      // Generate and add card images to archive
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        console.log('Generating image for card:', card.cardNumber);
        const imageBuffer = await generateCardImage(card.grid, card.cardNumber);
        archive.append(imageBuffer, { name: `card-${card.cardNumber}.png` });

        // Calculate and broadcast progress
        const progress = Math.round(((i + 1) / cards.length) * 100);
        wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN is 1
            client.send(JSON.stringify({
              type: 'cardGeneration',
              gameId: game.id,
              progress,
              status: 'generating'
            }));
          }
        });
      }

      console.log('Finalizing archive...');
      await archive.finalize();
      console.log('Archive finalized and sent');

    } catch (error) {
      console.error('Error downloading cards:', error);
      // Notify clients about error
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'cardGeneration',
            gameId: parseInt(req.params.id),
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });

      if (!res.headersSent) {
        res.status(500).json({
          message: "Error downloading cards",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Get game statistics
  app.post("/api/games/:id/stats", async (req, res) => {
    const { selectedArtists, excludedCards = [] } = req.body;
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id)),
    });
    if (!game) return res.status(404).json({ message: "Game not found" });

    const cards = await db.select().from(bingoCards).where(eq(bingoCards.gameId, game.id));

    const cardStats = cards
      .filter(card => !excludedCards.includes(card.cardNumber))
      .map(card => {
        const cleanGrid = card.grid.map(artist =>
          artist.replace(/❤️ /g, '').replace(/ ❤️/g, '')
        );
        const remaining = cleanGrid.filter(artist => !selectedArtists.includes(artist)).length;
        return {
          cardNumber: card.cardNumber,
          remainingCount: remaining,
          isComplete: remaining === 0
        };
      });

    cardStats.sort((a, b) => a.remainingCount - b.remainingCount);

    const stats = {
      cards: cardStats.map(stat => ({
        cardNumber: stat.cardNumber,
        remaining: stat.remainingCount
      })),
      winners: cardStats
        .filter(stat => stat.isComplete)
        .map(stat => stat.cardNumber),
      totalCards: cardStats.length
    };

    res.json(stats);
  });

  return httpServer;
}