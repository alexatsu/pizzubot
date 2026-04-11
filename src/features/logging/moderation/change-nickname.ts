import type { GuildMember } from 'discord.js'

import {
    EmbedBuilder,
    Events,
    type ColorResolvable,
    AuditLogEvent,
    type APIEmbedField,
} from 'discord.js'

import { LOG_CHANNEL_ID, PREVENT_DUPLICATE_MENTIONS } from '@/features/logging/config'
import { getLogColor, LogEventTypes } from '@/features/logging/shared/colors'
import { client } from '@/shared/config/client'

export function changeNicknameEvent() {
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const logChannel = newMember.guild.channels.cache.get(LOG_CHANNEL_ID)
        const isTextChannelValid = logChannel?.isTextBased()

        if (!isTextChannelValid) return

        const oldNickname = oldMember.nickname
        const newNickname = newMember.nickname
        const isNicknameNotChanged = oldNickname === newNickname

        if (isNicknameNotChanged) {
            return
        }

        try {
            const isNicknameSet = !oldNickname && newNickname
            const wasNicknameRemoved = oldNickname && !newNickname

            const avatarURL = newMember.user.displayAvatarURL()
            const userMention = newMember.toString()
            const userTag = newMember.user.tag

            let embed: EmbedBuilder

            if (isNicknameSet) {
                embed = createNicknameEmbed(
                    '👤 Nickname was Set',
                    `set new nickname **${userMention}**`,
                    getLogColor(LogEventTypes.NICKNAME_SET),
                    avatarURL,
                )
            } else if (wasNicknameRemoved) {
                embed = createNicknameEmbed(
                    '👤 Nickname was Removed',
                    `**${userMention}** removed nickname (was **${oldNickname}**)`,
                    getLogColor(LogEventTypes.NICKNAME_REMOVED),
                    avatarURL,
                )
            } else {
                embed = createNicknameEmbed(
                    '👤 Nickname Changed',
                    `**${userMention}** changed nickname from **${oldNickname}** to **${newNickname}**`,
                    getLogColor(LogEventTypes.NICKNAME_CHANGED),
                    avatarURL,
                )
            }

            embed.addFields(
                { name: 'User ID', value: newMember.id, inline: true },
                { name: 'Username', value: userTag, inline: true },
            )

            await attachExecutor(newMember, embed)

            await logChannel.send({ embeds: [embed], ...PREVENT_DUPLICATE_MENTIONS })

            console.log(
                `${newMember.user.tag} changed nickname: ${oldNickname || 'None'} → ${newNickname || 'None'}`,
            )
        } catch (error) {
            console.error('Error handling nickname change:', error)
        }
    })
}

export function createNicknameEmbed(
    title: string,
    description: string,
    color: ColorResolvable,
    thumbnail?: string,
) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()

    if (thumbnail) {
        embed.setThumbnail(thumbnail)
    }

    return embed
}

const attachExecutor = async (newMember: GuildMember, embed: EmbedBuilder) => {
    const auditLogs = await newMember.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberUpdate,
        limit: 5,
    })

    const nicknameChangeLog = auditLogs.entries.find(
        entry =>
            entry.target?.id === newMember.id &&
            entry.changes?.some(change => change.key === 'nick'),
    )

    const executor = nicknameChangeLog?.executor
    const isExecutorSameAsUser = executor?.id === newMember.id
    let executorFields: APIEmbedField | null = null
    let isSelfChange = false

    if (!isExecutorSameAsUser) {
        executorFields = {
            name: 'Changed by',
            value: `${executor?.toString()}`,
            inline: true,
        }
    } else {
        isSelfChange = true
    }

    if (executorFields) {
        embed.addFields(executorFields)
    }

    if (isSelfChange) {
        embed.addFields({
            name: 'Note',
            value: 'User changed their own nickname',
            inline: false,
        })
    }
}
