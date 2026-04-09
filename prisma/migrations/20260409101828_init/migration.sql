-- CreateTable
CREATE TABLE "users_table" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "walletUserId" TEXT NOT NULL,

    CONSTRAINT "users_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_table" (
    "userId" TEXT NOT NULL,
    "pizzuslices" INTEGER NOT NULL DEFAULT 0,
    "monthlySlicesEarned" INTEGER NOT NULL DEFAULT 0,
    "monthlyKey" TEXT NOT NULL,

    CONSTRAINT "wallet_table_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "roles_table" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discordRoleId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "roleColor" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_table_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_table_discordUserId_key" ON "users_table"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_table_walletUserId_key" ON "users_table"("walletUserId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_table_discordRoleId_key" ON "roles_table"("discordRoleId");

-- AddForeignKey
ALTER TABLE "users_table" ADD CONSTRAINT "users_table_walletUserId_fkey" FOREIGN KEY ("walletUserId") REFERENCES "wallet_table"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_table" ADD CONSTRAINT "roles_table_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users_table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
