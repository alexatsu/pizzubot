import { Events, REST, Routes } from 'discord.js'

import { aiCommandsREST } from '@/features/ai/discord/commands'
import { shopRoleCommandsREST } from '@/features/economy/shop/roles/service'
import { walletCommandsREST } from '@/features/economy/wallet/service'
import { pingCommandsREST } from '@/features/room-handling/ping-current-voice'
import { client } from '@/shared/config/client'
import { ENV } from '@/shared/config/env'

export async function initCommands() {
    const body = [
        ...pingCommandsREST,
        ...aiCommandsREST,
        ...walletCommandsREST,
        ...shopRoleCommandsREST,
    ]
    const rest = new REST({ version: '10' }).setToken(ENV.TOKEN)

    try {
        await rest.put(Routes.applicationGuildCommands(ENV.CLIENT_ID, ENV.GUILD_ID), { body })
        console.log(
            '✅ Registered commands:',
            body.map(c => c.name),
        )
    } catch (error) {
        console.error('❌ Failed to register:', error)
    }
}

export async function initServer() {
    client.once(Events.ClientReady, readyClient => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`)
    })

    await client.login(ENV.TOKEN)
}
