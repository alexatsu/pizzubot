import { Events, REST, Routes } from 'discord.js'
import * as cron from 'node-cron'

import { handleBackup, hasGoogleEnvs } from '@/backup'
import { aiCommandsREST } from '@/features/ai/discord/commands'
import { shopRoleCommandsREST } from '@/features/economy/shop/roles/service'
import { walletCommandsREST } from '@/features/economy/wallet/service'
import { pingCommandsREST } from '@/features/room-handling/ping-current-voice'
import { client } from '@/shared/config/client'
import { REQUIRED_ENV } from '@/shared/config/env'

export function initValidateEnv() {
    const missingVars = Object.entries(REQUIRED_ENV)
        .filter(([key]) => !process.env[key])
        .map(([key]) => key)

    if (missingVars.length > 0) {
        console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
        process.exit(1)
    }
}

export async function initCommands() {
    const body = [
        ...pingCommandsREST,
        ...aiCommandsREST,
        ...walletCommandsREST,
        ...shopRoleCommandsREST,
    ]
    const rest = new REST({ version: '10' }).setToken(REQUIRED_ENV.TOKEN)

    try {
        await rest.put(
            Routes.applicationGuildCommands(REQUIRED_ENV.CLIENT_ID, REQUIRED_ENV.GUILD_ID),
            { body },
        )
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

    await client.login(REQUIRED_ENV.TOKEN)
}

export function initBackup() {
    if (!hasGoogleEnvs()) {
        console.log('Google backup envs not set, skipping scheduled backup')
        return
    }

    cron.schedule('0 0 * * *', async () => {
        await handleBackup()
    })
}
