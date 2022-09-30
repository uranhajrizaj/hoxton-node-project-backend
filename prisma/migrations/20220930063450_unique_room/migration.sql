/*
  Warnings:

  - A unique constraint covering the columns `[room]` on the table `Friendship` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Friendship_room_key" ON "Friendship"("room");
