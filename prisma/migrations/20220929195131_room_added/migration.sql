/*
  Warnings:

  - Made the column `userId` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Friendship" (
    "friend1Id" INTEGER NOT NULL,
    "friend2Id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "room" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("friend1Id", "friend2Id"),
    CONSTRAINT "Friendship_friend1Id_fkey" FOREIGN KEY ("friend1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Friendship_friend2Id_fkey" FOREIGN KEY ("friend2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Friendship" ("friend1Id", "friend2Id", "status") SELECT "friend1Id", "friend2Id", "status" FROM "Friendship";
DROP TABLE "Friendship";
ALTER TABLE "new_Friendship" RENAME TO "Friendship";
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "id", "userId") SELECT "content", "id", "userId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
