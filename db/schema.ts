import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { type InferModel } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Games table with user relation
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  cardCount: integer("card_count").notNull(),
  artists: text("artists").array().notNull(),
  hasHeart: boolean("has_heart").notNull().default(false),
  status: text("status").notNull().default('created'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bingo cards table
export const bingoCards = pgTable("bingo_cards", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  cardNumber: integer("card_number").notNull(),
  grid: text("grid").array().notNull(),
  heartPosition: integer("heart_position"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const gamesRelations = relations(games, ({ one }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  games: many(games),
}));

export const bingoCardsRelations = relations(bingoCards, ({ one }) => ({
  game: one(games, {
    fields: [bingoCards.gameId],
    references: [games.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;

export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);
export type Game = InferModel<typeof games>;
export type NewGame = InferModel<typeof games, "insert">;

export const insertBingoCardSchema = createInsertSchema(bingoCards);
export const selectBingoCardSchema = createSelectSchema(bingoCards);
export type BingoCard = InferModel<typeof bingoCards>;
export type NewBingoCard = InferModel<typeof bingoCards, "insert">;