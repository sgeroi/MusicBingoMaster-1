import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { type InferModel } from "drizzle-orm";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cardCount: integer("card_count").notNull(),
  artists: text("artists").array().notNull(),
  hasHeart: boolean("has_heart").notNull().default(false),
  status: text("status").notNull().default('created'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bingoCards = pgTable("bingo_cards", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  cardNumber: integer("card_number").notNull(),
  grid: text("grid").array().notNull(), // 6x6 array of artist names
  heartPosition: integer("heart_position"), // позиция сердечка (0-35), null если сердечка нет
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);
export type Game = InferModel<typeof games>;
export type NewGame = InferModel<typeof games, "insert">;

export const insertBingoCardSchema = createInsertSchema(bingoCards);
export const selectBingoCardSchema = createSelectSchema(bingoCards);
export type BingoCard = InferModel<typeof bingoCards>;
export type NewBingoCard = InferModel<typeof bingoCards, "insert">;