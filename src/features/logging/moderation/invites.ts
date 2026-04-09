import type { Invite } from 'discord.js'

import { EmbedBuilder, Events } from 'discord.js'
import { LOG_CHANNEL_ID } from '@/features/logging/config'
import { getLogColor, LogEventTypes } from '@/features/logging/shared/colors'
import { client } from '@/shared/config/client'

const guildInvites = new Map<string, Map<string, number>>()

const handleInviteTracking = () => {
    client.on(Events.ClientReady, async () => {
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch()
                const inviteMap = new Map<string, number>()

                invites.each(invite => inviteMap.set(invite.code, invite.uses || 0))

                guildInvites.set(guild.id, inviteMap)
            } catch (error) {
                console.error(`Failed to fetch invites for ${guild.name}:`, error)
            }
        }
        console.log(`Invite tracking initialized for ${client.guilds.cache.size} guilds`)
    })
}

const handleInviteChanges = () => {
    client.on(Events.InviteCreate, invite => {
        const guildId = invite.guild?.id

        if (guildId) {
            const invites = guildInvites.get(guildId) || new Map<string, number>()

            invites.set(invite.code, invite.uses || 0)
            guildInvites.set(guildId, invites)
        }
    })
}

const handleInviteDeletion = () => {
    client.on(Events.InviteDelete, invite => {
        const guildId = invite.guild?.id

        if (guildId) {
            const invites = guildInvites.get(guildId)

            if (invites) {
                invites.delete(invite.code)
            }
        }
    })
}

const handleMemberJoin = () => {
    client.on(Events.GuildMemberAdd, async member => {
        const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID)

        if (!logChannel?.isTextBased()) return

        try {
            const oldInvites = guildInvites.get(member.guild.id) || new Map<string, number>()
            const newInvites = await member.guild.invites.fetch()

            let usedInvite: Invite | null = null

            for (const [code, invite] of newInvites) {
                const oldUses = oldInvites.get(code) || 0
                if (invite.uses && invite.uses > oldUses) {
                    usedInvite = invite
                    break
                }
            }

            const inviteMap = new Map<string, number>()

            newInvites.each(invite => inviteMap.set(invite.code, invite.uses || 0))
            guildInvites.set(member.guild.id, inviteMap)

            const embed = new EmbedBuilder()
                .setTitle('👋 New Member Joined')
                .setDescription(`${member.user.tag} joined the server`)
                .setColor(getLogColor(LogEventTypes.MEMBER_JOIN))
                .setThumbnail(member.user.displayAvatarURL())
                .addFields({
                    name: 'Account Created',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true,
                })
                .setTimestamp()

            if (usedInvite) {
                embed.addFields(
                    { name: 'Invite Used', value: usedInvite.code, inline: true },
                    {
                        name: 'Inviter',
                        value: usedInvite.inviter?.toString() || 'Unknown',
                        inline: true,
                    },
                )

                if (usedInvite.maxUses) {
                    embed.addFields({
                        name: 'Uses',
                        value: `${usedInvite.uses}/${usedInvite.maxUses}`,
                        inline: true,
                    })
                }
            } else {
                embed.addFields({
                    name: 'Invite',
                    value: 'Could not determine which invite was used',
                    inline: true,
                })
            }

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            console.error('Error handling member join:', error)
        }
    })
}

export function handleInvitesEvent() {
    handleInviteTracking()
    handleInviteChanges()
    handleMemberJoin()
    handleInviteDeletion()
}
