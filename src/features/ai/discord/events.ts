import type { VoiceState } from 'discord.js'

import { Events } from 'discord.js'

import { guildConnections } from '@/features/ai/config'
import { cleanupGuildConnection } from '@/features/ai/gemini/core'
import { client } from '@/shared/config/client'

export function cleanupWhenDisconnectedEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
        if (newState.member?.id !== client.user?.id) return

        const guildId = newState.guild.id
        const guildState = guildConnections.get(guildId)

        if (!guildState) return

        const wasInChannel = oldState.channelId !== null
        const isInChannel = newState.channelId !== null

        if (wasInChannel && !isInChannel) {
            await cleanupGuildConnection(guildId, 'Bot disconnected from voice channel')
        }
    })
}
