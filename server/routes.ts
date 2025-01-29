import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { games, bingoCards } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCanvas, loadImage } from "canvas";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";

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
  // Генерируем уникальную комбинацию исполнителей
  let grid: string[];
  let gridKey: string;

  do {
    const shuffled = shuffleArray(artists);
    grid = shuffled.slice(0, 36);
    gridKey = grid.sort().join(','); // Сортируем для правильного сравнения
  } while (usedCombinations.has(gridKey));

  // Сохраняем использованную комбинацию
  usedCombinations.add(gridKey);

  // Перемешиваем grid обратно, так как мы его отсортировали для сравнения
  grid = shuffleArray(grid);

  // Если включена опция с сердечком, добавляем его к случайному исполнителю
  if (hasHeart) {
    const randomIndex = Math.floor(Math.random() * grid.length);
    grid[randomIndex] = `❤️ ${grid[randomIndex]} ❤️`;
    console.log(`Card ${cardNumber}: Added hearts to artist at index ${randomIndex}: ${grid[randomIndex]}`);
  }

  return grid;
}

async function generateCardImage(artists: string[], cardNumber: number): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'attached_assets', 'bez_kletok.png');

  // Проверяем существование шаблона
  try {
    await fs.access(templatePath);
  } catch (error) {
    console.error('Template file not found:', templatePath);
    throw new Error('Template file not found');
  }

  // Загружаем шаблон
  const template = await loadImage(templatePath);
  console.log('Template loaded, size:', template.width, 'x', template.height);

  // Создаем canvas с размерами шаблона
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');

  // Рисуем шаблон
  ctx.drawImage(template, 0, 0);

  // Определяем размеры и положение сетки исполнителей
  const gridStartX = template.width * 0.1; // 10% от левого края
  const gridStartY = template.height * 0.25; // 25% от верхнего края
  const gridWidth = template.width * 0.8; // 80% ширины
  const gridHeight = template.height * 0.6; // 60% высоты

  const cellWidth = gridWidth / 6;
  const cellHeight = gridHeight / 6;

  // Добавляем исполнителей
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const index = i * 6 + j;
      const artist = artists[index];
      if (artist) {
        const cellCenterX = gridStartX + (j + 0.5) * cellWidth;
        const cellCenterY = gridStartY + (i + 0.5) * cellHeight;

        // Разбиваем текст на строки если нужно
        const words = artist.split(' ');
        let lines = [''];
        let currentLine = 0;

        ctx.font = 'bold 16px Arial';
        words.forEach(word => {
          const testLine = lines[currentLine] + (lines[currentLine] ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > cellWidth - 10) {
            currentLine++;
            lines[currentLine] = word;
          } else {
            lines[currentLine] = testLine;
          }
        });

        // Рисуем текст
        const lineHeight = 18;
        const totalHeight = lines.length * lineHeight;
        const textStartY = cellCenterY - (totalHeight / 2);

        lines.forEach((line, lineIndex) => {
          const y = textStartY + lineIndex * lineHeight;
          // Белая обводка для лучшей читаемости
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.strokeText(line, cellCenterX, y);
          // Текст
          ctx.fillStyle = 'black';
          ctx.fillText(line, cellCenterX, y);
        });
      }
    }
  }

  // Добавляем номер карточки
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

  // Create new game
  app.post("/api/games", async (req, res) => {
    const { name, cardCount, artists, hasHeart } = req.body;
    console.log("Creating new game with hasHeart:", hasHeart);

    const artistList = artists.split('\n').map((a: string) => a.trim()).filter(Boolean);

    if (artistList.length < 36) {
      return res.status(400).json({ message: "Need at least 36 artists for a 6x6 grid" });
    }

    // Очищаем Set с использованными комбинациями перед генерацией новой игры
    usedCombinations.clear();

    const [game] = await db.insert(games).values({
      name,
      cardCount,
      artists: artistList,
      hasHeart: !!hasHeart,
    }).returning();

    // Generate bingo cards
    const cardsToInsert = [];
    for (let i = 1; i <= cardCount; i++) {
      const grid = generateBingoCard(artistList, i, !!hasHeart);
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
    console.log('Starting cards generation for game:', req.params.id);

    try {
      const game = await db.query.games.findFirst({
        where: eq(games.id, parseInt(req.params.id)),
      });

      if (!game) {
        console.error('Game not found:', req.params.id);
        return res.status(404).json({ message: "Game not found" });
      }

      console.log('Found game:', game.id, 'Getting cards...');

      const cards = await db.select().from(bingoCards).where(eq(bingoCards.gameId, game.id));
      console.log('Found cards:', cards.length);

      // Устанавливаем заголовки ответа
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=bingo-cards-game-${game.id}.zip`);

      // Создаем архив
      const archive = archiver('zip', {
        zlib: { level: 9 } // Максимальная компрессия
      });

      // Подключаем обработчики событий архива
      archive.on('error', (err) => {
        console.error('Archiver error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error creating archive" });
        }
      });

      archive.on('end', () => {
        console.log('Archive finalized successfully');
      });

      // Отправляем архив в response
      archive.pipe(res);

      // Генерируем и добавляем карточки в архив
      console.log('Starting to generate card images...');
      for (const card of cards) {
        console.log('Generating card:', card.cardNumber);
        const imageBuffer = await generateCardImage(card.grid, card.cardNumber);
        archive.append(imageBuffer, { name: `card-${card.cardNumber}.png` });
      }

      console.log('Finalizing archive...');
      await archive.finalize();
      console.log('Archive finalized and sent');

    } catch (error) {
      console.error('Error generating cards:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Error generating cards",
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

    // Информация по каждой карточке
    const cardStats = cards
      .filter(card => !excludedCards.includes(card.cardNumber)) // Исключаем карточки
      .map(card => {
        // Очищаем имена исполнителей от эмодзи сердечка для сравнения
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

    // Сортируем карточки по количеству оставшихся исполнителей
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