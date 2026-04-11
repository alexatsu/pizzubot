import 'dotenv/config'
import { REST, Routes } from 'discord.js'

import { initValidateEnv } from '@/init'
import { REQUIRED_ENV } from '@/shared/config/env'

export async function cleanupCommands() {
    initValidateEnv()
    const rest = new REST({ version: '10' }).setToken(REQUIRED_ENV.TOKEN)

    try {
        await rest.put(Routes.applicationGuildCommands(REQUIRED_ENV.CLIENT_ID, REQUIRED_ENV.GUILD_ID), { body: [] })
        console.log('🧹 Cleared guild commands')
    } catch (error) {
        console.error('❌ Failed to clear commands:', error)
    }
}

await cleanupCommands()
