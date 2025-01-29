import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAdminUser() {
  const adminExists = await db.query.users.findFirst({
    where: eq(users.username, "admin")
  });

  if (!adminExists) {
    const hashedPassword = await hashPassword("2003032016");
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      isAdmin: true
    });
    console.log("Admin user created");
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export type AuthenticatedRequest = Request & {
  session: {
    userId?: number;
    isAdmin?: boolean;
  } & Express.Session;
};
