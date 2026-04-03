import { Events, AuditLogEvent, EmbedBuilder } from 'discord.js'

import { getLogColor, LogEventTypes } from '@/features/logging/shared/colors'
import { client } from '@/shared/config/client'
import { LOG_CHANNEL_ID } from '@/features/logging/config'

const threeSeconds = 3000
const waitForAuditLogsToPopulate = async () =>
    await new Promise(resolve => setTimeout(resolve, threeSeconds))

export function kickUserEvent() {
    client.on(Events.GuildMemberRemove, async member => {
        const textChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID)

        if (!textChannel?.isTextBased()) return

        try {
            await waitForAuditLogsToPopulate()

            const recentBans = await member.guild.bans.fetch().catch(() => null)
            const wasBanned = recentBans?.has(member.id)

            if (wasBanned) {
                console.log(`${member.user.tag} was banned (skip kick check)`)
                return
            }

            const kickLogs = await member.guild
                .fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 })
                .catch(error => {
                    console.error('Failed to fetch kick logs:', error)
                    return null
                })

            const fifteenSeconds = 15000
            const kickEntry = kickLogs?.entries.find(
                entry =>
                    entry.target?.id === member.user.id &&
                    Date.now() - entry.createdTimestamp < fifteenSeconds,
            )

            if (kickEntry) {
                const embed = new EmbedBuilder()
                    .setTitle('🚪 Member Kicked')
                    .setDescription(`${member.toString()} was kicked from the server`)
                    .setColor(getLogColor(LogEventTypes.MEMBER_KICK))
                    .addFields(
                        {
                            name: 'Moderator',
                            value: kickEntry.executor?.toString() || 'Unknown',
                            inline: true,
                        },
                        {
                            name: 'Reason',
                            value: kickEntry.reason || 'No reason provided',
                            inline: true,
                        },
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp()

                await textChannel.send({ embeds: [embed] })
                console.log(`${member.user.tag} was kicked by ${kickEntry.executor?.tag}`)
                return
            }

            const embed = new EmbedBuilder()
                .setTitle('👋 Member Left')
                .setDescription(`${member.toString()} left the server`)
                .setColor('#FFFF00')
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp()

            await textChannel.send({ embeds: [embed] })
            console.log(`${member.user.tag} left the server`)
        } catch (error) {
            console.error('Error handling member removal:', error)
        }
    })
}
