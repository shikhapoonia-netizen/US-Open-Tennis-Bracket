-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "Tour" AS ENUM ('ATP', 'WTA');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Tournament" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "tour" "Tour" NOT NULL,
  "drawSize" INTEGER NOT NULL,
  "startAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Player" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "seed" INTEGER,
  "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Match" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "round" INTEGER NOT NULL,
  "index" INTEGER NOT NULL,
  "p1Id" TEXT,
  "p2Id" TEXT,
  "winnerId" TEXT
);
CREATE UNIQUE INDEX "Match_tournament_round_index_unique" ON "Match" ("tournamentId", "round", "index");

CREATE TABLE "Entry" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "label" TEXT NOT NULL,
  "locked" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "Entry_user_tournament_unique" UNIQUE ("userId","tournamentId")
);

CREATE TABLE "Pick" (
  "entryId" TEXT NOT NULL REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "matchId" TEXT NOT NULL REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "winnerId" TEXT NOT NULL,
  PRIMARY KEY ("entryId","matchId")
);
