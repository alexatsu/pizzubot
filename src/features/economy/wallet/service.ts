import type { CommandInteraction } from 'discord.js'

import { MessageFlags, SlashCommandBuilder, type CacheType } from 'discord.js'
import { ensureUser } from '@/shared/prisma/user'
import { type CommandHandler, CommandType } from '@/shared/lib/interaction-events/commands'
import { prisma } from '@/shared/prisma/client'

export enum WalletCommands {
    Balance = 'wallet-balance',
}

export const walletCommandsREST = [
    new SlashCommandBuilder()
        .setName(WalletCommands.Balance)
        .setDescription('Проверить баланс кошелька'),
].map(c => c.toJSON())

export const walletCommands: Record<WalletCommands, CommandHandler> = {
    [WalletCommands.Balance]: { type: CommandType.Base, handler: checkWalletBalanceCommand },
}

export async function checkWalletBalanceCommand(interaction: CommandInteraction<CacheType>) {
    const discordUserId = interaction.user.id
    const userId = await ensureUser(discordUserId)

    const balance = await prisma.wallet.findFirst({
        where: { userId },
        select: { pizzuslices: true },
    })

    return interaction.reply({
        content: `🍕 **Баланс кошелька**\n> \`${balance?.pizzuslices ?? 0}\` pizzuslices`,
        flags: MessageFlags.Ephemeral,
    })
}
