import type { EmbedBuilder } from 'discord.js'

import { Events } from 'discord.js'

import { getLogColor, LogEventTypes } from '@/features/logging/shared/colors'
import { createVoiceEmbed } from '@/features/logging/voice/embeds/voice'
import { client } from '@/shared/config/client'
import { ENV } from '@/shared/config/env'
import { PREVENT_DUPLICATE_MENTIONS } from '@/shared/config/state'

export function voiceStateUpdateEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const textChannel = oldState.guild.channels.cache.get(LOG_CHANNEL_ID)
        const isTextChannelValid = textChannel?.isTextBased()

        if (!textChannel || !isTextChannelValid) return

        let embed: EmbedBuilder | null = null
        const isUserJoined = !oldState.channel && newState.channel
        const isUserLeft = oldState.channel && !newState.channel
        const isUserSwitchedChannels =
            oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id
        const userMention = newState.member?.toString() || 'Unknown user'

        try {
            if (isUserJoined) {
                embed = createVoiceEmbed(
                    '🎤 Voice Channel Joined',
                    `${userMention} joined ${newState.channel.toString()}`,
                    getLogColor(LogEventTypes.USER_JOIN),
                    newState.member?.user.displayAvatarURL(),
                )

                console.log(
                    `${newState.member?.user.tag} joined voice channel ${newState.channel.name}`,
                )
            } else if (isUserLeft) {
                embed = createVoiceEmbed(
                    '🚪 Voice Channel Left',
                    `${userMention} left ${oldState.channel.toString()}`,
                    getLogColor(LogEventTypes.USER_LEAVE),
                    oldState.member?.user.displayAvatarURL(),
                )

                console.log(
                    `${oldState.member?.user.tag} left voice channel ${oldState.channel.name}`,
                )
            } else if (isUserSwitchedChannels) {
                embed = createVoiceEmbed(
                    '🔀 Voice Channel Changed',
                    `${userMention} moved from ${oldState.channel.toString()} to ${newState.channel.toString()}`,
                    getLogColor(LogEventTypes.USER_MOVE),
                    newState.member?.user.displayAvatarURL(),
                )

                console.log(`${newState.member?.user.tag} moved between voice channels`)
            }

            if (embed) {
                await textChannel.send({ embeds: [embed], ...PREVENT_DUPLICATE_MENTIONS })
            }
        } catch (error) {
            console.error('Error handling voice state update:', error)
        }
    })
}
