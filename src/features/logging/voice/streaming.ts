import { Events } from 'discord.js'

import { LOG_CHANNEL_ID } from '@/features/logging/config'
import { getLogColor, LogEventTypes } from '@/features/logging/shared/colors'
import { createVoiceEmbed } from '@/features/logging/voice/embeds/voice'
import { client } from '@/shared/config/client'
import { PREVENT_DUPLICATE_MENTIONS } from '@/shared/config/state'



export function voiceStreamingEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const textChannel = oldState.guild.channels.cache.get(LOG_CHANNEL_ID)

        const isTextChannelValid = textChannel?.isTextBased()
        if (!isTextChannelValid) return

        try {
            const userChangedChannels =
                !oldState.channel ||
                !newState.channel ||
                oldState.channel.id !== newState.channel.id
            if (userChangedChannels) {
                return
            }

            const streamingStateUnchanged = oldState.streaming === newState.streaming
            if (streamingStateUnchanged) {
                return
            }

            const userMention = newState.member?.toString() || 'Unknown user'
            const isStreamingStarting = newState.streaming
            const action = isStreamingStarting ? 'started' : 'stopped'

            const logEventType = isStreamingStarting
                ? LogEventTypes.USER_STREAM_START
                : LogEventTypes.USER_STREAM_STOP

            const embed = createVoiceEmbed(
                isStreamingStarting ? '🎥 Streaming Started' : '⏹️ Streaming Stopped',
                `${userMention} ${action} streaming in ${newState.channel.toString()}`,
                getLogColor(logEventType),
                newState.member?.user.displayAvatarURL(),
            )

            console.log(`${newState.member?.user.tag} ${action} streaming`)

            await textChannel.send({ embeds: [embed], ...PREVENT_DUPLICATE_MENTIONS })
        } catch (error) {
            console.error('Error handling voice state update:', error)
        }
    })
}
