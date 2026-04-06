import type { VoiceBasedChannel, VoiceState } from 'discord.js'

import { ChannelType, Events, PermissionFlagsBits } from 'discord.js'

import { CREATE_VOICE_CHANNEL_ID } from '@/features/room-handling/config'
import { client } from '@/shared/config/client'

export const tempChannels = new Set<string>()

export function createTempVCEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const oldChannel = oldState.channel
        const newChannel = newState.channel

        const joinedLobby =
            oldChannel?.id !== CREATE_VOICE_CHANNEL_ID &&
            newChannel?.id === CREATE_VOICE_CHANNEL_ID &&
            newState.member

        if (joinedLobby && !tempChannels.has(newChannel?.id)) {
            await createChannel(newState)
            return
        }

        const leftTempChannel =
            oldChannel && tempChannels.has(oldChannel.id) && oldChannel.id !== newChannel?.id

        if (leftTempChannel) {
            await deleteChannel(oldState, oldChannel)
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

    const permissionOverwrites = [
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
        },
    ]

    const safeChannelName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

    const channelName = `${safeChannelName(member.displayName)}-${member.id}`

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

async function deleteChannel(oldState: VoiceState, oldChannel: VoiceBasedChannel) {
    try {
        const fresh = await oldState.guild.channels.fetch(oldChannel.id)

        if (!fresh?.isVoiceBased()) return

        if (fresh.members.size === 0) {
            await fresh.permissionOverwrites
                .edit(oldState.guild.roles.everyone.id, {
                    Connect: false,
                })
                .catch(() => {})

            tempChannels.delete(fresh.id)

            setTimeout(async () => {
                try {
                    const finalCheck = await oldState.guild.channels.fetch(fresh.id)
                    if (finalCheck?.isVoiceBased() && finalCheck.members.size === 0) {
                        await fresh.delete()
                        console.log(`Deleted locked empty channel: ${fresh.id}`)
                    }
                } catch (error) {
                    console.error(`Failed to delete channel ${fresh.id}:`, error)
                }
            }, 1000)
        }
    } catch (error) {
        console.error(`Error handling temp channel leave ${oldChannel.id}:`, error)
    }
}
