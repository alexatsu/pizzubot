import { EmbedBuilder, Events } from 'discord.js'

import { LOG_CHANNEL_ID } from '@/features/logging/config'
import { getLogColor, LogEventTypes } from '@/features/logging/shared/colors'
import { isInExcludedCategory } from '@/features/logging/shared/excluded'
import { client } from '@/shared/config/client'

const messageEdits = new Map<string, string>()

export function editMessageEvent() {
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (await isInExcludedCategory(newMessage)) return

        const logChannel = newMessage.guild?.channels.cache.get(LOG_CHANNEL_ID)
        const isServer = newMessage.guild
        const isBot = newMessage.author?.bot

        if (
            !isServer ||
            !logChannel ||
            !logChannel.isTextBased() ||
            isBot ||
            oldMessage.content === newMessage.content
        )
            return

        try {
            if (oldMessage.content) {
                messageEdits.set(newMessage.id, oldMessage.content)
            }

            const previousContent = messageEdits.get(newMessage.id) || '*No previous content*'

            const embed = new EmbedBuilder()
                .setTitle('✏️ Message Edited')
                .setDescription(
                    `Message from ${newMessage.author.toString()} was edited in ${newMessage.channel.toString()}`,
                )
                .addFields(
                    { name: 'Previous Content', value: previousContent },
                    { name: 'New Content', value: newMessage.content || '*No text content*' },
                    { name: 'Message Link', value: `[Jump to Message](${newMessage.url})` },
                    { name: 'Message ID', value: newMessage.id, inline: true },
                )
                .setColor(getLogColor(LogEventTypes.MESSAGE_EDIT))
                .setThumbnail(newMessage.author.displayAvatarURL())
                .setTimestamp()

            await logChannel.send({ embeds: [embed] })

            console.log(
                `Message from ${newMessage.author.tag} was edited in #${newMessage.channel.toString()}`,
            )
        } catch (error) {
            console.error('Error handling message edit:', error)
        }
    })
}
