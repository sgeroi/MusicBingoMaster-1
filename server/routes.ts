import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { games, bingoCards, users, templates } from "@db/schema"; // Added templates import
import { eq, or } from "drizzle-orm";
import { createCanvas, loadImage } from "canvas";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { requireAuth, requireAdmin, hashPassword, comparePasswords, type AuthenticatedRequest } from "./auth";
import multer from "multer";
import { mkdir } from "fs/promises";


// Хранилище уже использованных комбинаций для текущей игры
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'templates');
    await mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

async function generateCardImage(artists: string[], cardNumber: number, templateId: number): Promise<Buffer> {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId)
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const templatePath = template.imagePath;
    const templateImage = await loadImage(templatePath);

    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    ctx.drawImage(templateImage, 0, 0);

    // Grid settings
    const gridStartX = templateImage.width * 0.1;
    const gridStartY = templateImage.height * 0.25;
    const gridWidth = templateImage.width * 0.8;
    const gridHeight = templateImage.height * 0.6;

    const cellWidth = gridWidth / 6;
    const cellHeight = gridHeight / 6;

    // Draw grid lines
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;

    // Vertical lines
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(gridStartX + i * cellWidth, gridStartY);
      ctx.lineTo(gridStartX + i * cellWidth, gridStartY + gridHeight);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(gridStartX, gridStartY + i * cellHeight);
      ctx.lineTo(gridStartX + gridWidth, gridStartY + i * cellHeight);
      ctx.stroke();
    }

    // Draw artists
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

          ctx.font = 'bold 64px Arial';
          words.forEach(word => {
            const testLine = lines[currentLine] + (lines[currentLine] ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > cellWidth - 40) {
              currentLine++;
              lines[currentLine] = word;
            } else {
              lines[currentLine] = testLine;
            }
          });

          const lineHeight = 72;
          const totalHeight = lines.length * lineHeight;
          const textStartY = cellCenterY - (totalHeight / 2);

          lines.forEach((line, lineIndex) => {
            const y = textStartY + lineIndex * lineHeight;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 8;
            ctx.strokeText(line, cellCenterX, y);
            ctx.fillStyle = 'black';
            ctx.fillText(line, cellCenterX, y);
          });
        }
      }
    }

    // Draw card number (2x larger)
    ctx.font = 'bold 56px Arial'; // Doubled from 28px
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    const numberX = templateImage.width * 0.85;
    const numberY = templateImage.height * 0.12;
    ctx.fillText(`${cardNumber}`, numberX, numberY);

    return canvas.toBuffer();
  }


export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (!user || !(await comparePasswords(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    (req.session as any).userId = user.id;
    (req.session as any).isAdmin = user.isAdmin;

    res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // User management routes (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    const allUsers = await db.query.users.findMany({
      columns: {
        password: false,
      }
    });
    res.json(allUsers);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    const { username, password, isAdmin } = req.body;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const [user] = await db.insert(users).values({
      username,
      password: hashedPassword,
      isAdmin: !!isAdmin
    }).returning({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
    });

    res.json(user);
  });

  // Protected game routes
  app.post("/api/games", requireAuth, async (req: AuthenticatedRequest, res) => {
    const { name, cardCount, artists, hasHeart, templateId = 1 } = req.body; // Added templateId with default
    const userId = req.session.userId!;

    const artistList = artists.split('\n').map((a: string) => a.trim()).filter(Boolean);

    if (artistList.length < 36) {
      return res.status(400).json({ message: "Need at least 36 artists for a 6x6 grid" });
    }

    usedCombinations.clear();

    const [game] = await db.insert(games).values({
      userId,
      name,
      cardCount,
      artists: artistList,
      hasHeart: !!hasHeart,
      templateId: templateId // Added templateId to game
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

  // Get all games for the logged-in user
  app.get("/api/games", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.session.userId!;
    const isAdmin = req.session.isAdmin;

    let userGames;
    if (isAdmin) {
      // Admins can see all games
      userGames = await db.query.games.findMany({
        orderBy: (games, { desc }) => [desc(games.createdAt)],
      });
    } else {
      // Regular users can see their own games and admin-created games
      const adminUser = await db.query.users.findFirst({
        where: eq(users.username, "admin")
      });

      if (!adminUser) {
        return res.status(500).json({ message: "Admin user not found" });
      }

      userGames = await db.query.games.findMany({
        where: (games, { or, eq }) => or(
          eq(games.userId, userId),
          eq(games.userId, adminUser.id)
        ),
        orderBy: (games, { desc }) => [desc(games.createdAt)],
      });
    }

    res.json(userGames);
  });

  // Get specific game (only if owned by the user)
  app.get("/api/games/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.session.userId!;
    const game = await db.query.games.findFirst({
      where: eq(games.id, parseInt(req.params.id))
    });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.userId !== userId && !req.session.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(game);
  });

  // Delete specific game
  app.delete("/api/games/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.session.userId!;
    const gameId = parseInt(req.params.id);

    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId)
    });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.userId !== userId && !req.session.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete associated bingo cards first
    await db.delete(bingoCards).where(eq(bingoCards.gameId, gameId));

    // Then delete the game
    await db.delete(games).where(eq(games.id, gameId));

    res.json({ message: "Game deleted successfully" });
  });

  // Generate and download cards
  app.get("/api/games/:id/cards", requireAuth, async (req: AuthenticatedRequest, res) => {
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
      });

      archive.pipe(res);

      for (const card of cards) {
        console.log('Generating image for card:', card.cardNumber);
        const imageBuffer = await generateCardImage(card.grid, card.cardNumber, game.templateId); // Use game.templateId
        archive.append(imageBuffer, { name: `card-${card.cardNumber}.png` });
      }

      console.log('Finalizing archive...');
      await archive.finalize();
      console.log('Archive finalized and sent');

    } catch (error) {
      console.error('Error downloading cards:', error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Error downloading cards",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Get game statistics
  app.post("/api/games/:id/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
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


  // Template management routes (admin only)
  app.get("/api/templates", requireAuth, async (req, res) => {
    const allTemplates = await db.query.templates.findMany({
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    });
    res.json(allTemplates);
  });

  app.post("/api/templates", requireAdmin, upload.single('template'), async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Template name is required" });
    }

    const [template] = await db.insert(templates).values({
      name,
      imagePath: req.file.path,
      isDefault: false,
    }).returning();

    res.json(template);
  });

  return httpServer;
}