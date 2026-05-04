import type { OverwriteResolvable, VoiceState } from 'discord.js'

import { ChannelType, Events, PermissionFlagsBits } from 'discord.js'

import { CREATE_VOICE_CHANNEL_ID } from '@/features/room-handling/config'
import { client } from '@/shared/config/client'

export const tempChannels = new Set<string>()

export function createTempVCEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const oldChannelId = oldState.channelId
        const newChannelId = newState.channelId

        const movedOutOfTemp =
            oldChannelId && tempChannels.has(oldChannelId) && oldChannelId !== newChannelId

        if (movedOutOfTemp) {
            const oldChannel = await oldState.guild.channels.fetch(oldChannelId)
            if (oldChannel?.isVoiceBased() && oldChannel.members.size === 0) {
                tempChannels.delete(oldChannelId)
                await oldChannel.delete().catch(() => {})
            }
        }

        const joinedLobby =
            newChannelId === CREATE_VOICE_CHANNEL_ID &&
            oldChannelId !== CREATE_VOICE_CHANNEL_ID &&
            newState.member

        if (joinedLobby) {
            await createChannel(newState)
        }
    })
}

const createChannel = async (newState: VoiceState) => {
    const guild = newState.guild
    const member = newState.member

    if (!member) {
        console.error('Member is null')
        return
    }

    const permissionOverwrites: OverwriteResolvable[] = [
        {
            id: member.id,
            allow: [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
            ],
        },
        {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            deny: [PermissionFlagsBits.MentionEveryone],
        },
    ]

    const safeChannelName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

    const channelName = `${safeChannelName(member.displayName)}'s room`

    const newChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: newState.channel?.parent?.id,
        userLimit: 5,
        permissionOverwrites,
    })

    tempChannels.add(newChannel.id)
    console.log(`Registered temp channel: ${newChannel.id}`)

    await member.voice.setChannel(newChannel)

    return newChannel
}
