import type { VoiceChannel, VoiceState } from 'discord.js'

import { ChannelType, Events, PermissionFlagsBits } from 'discord.js'

import { CREATE_VOICE_CHANNEL_ID } from '@/features/room-handling/config'
import { client } from '@/shared/config/client'

export const tempChannels = new Set<string>()

export function registerTempChannel(channel: VoiceChannel) {
    tempChannels.add(channel.id)
    console.log(`Registered temp channel: ${channel.id}`)
}

export function createTempVCEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const userWasNotOnServer =
            !oldState.channel && newState.channel?.id === CREATE_VOICE_CHANNEL_ID // when user was not in the other channel
        const member = newState.member

        if (userWasNotOnServer) {
            console.log(`User ${newState.member?.user.tag} joined lobby`)

            try {
                const channelName = await createChannel(newState)
                console.log(`Created personal channel: ${channelName} for ${member?.user.tag}`)
            } catch (error) {
                console.error('Error creating personal channel:', error)
            }
        }
        const userWasInTheChannel = oldState.channel
        const userInTheChannel = newState.channel
        const isChannelChanged = oldState.channel?.id !== newState.channel?.id
        const isNewLobby = newState.channel?.id === CREATE_VOICE_CHANNEL_ID

        if (userWasInTheChannel && userInTheChannel && isChannelChanged && isNewLobby) {
            console.log(`User ${newState.member?.user.tag} switched to lobby`)

            try {
                const channelName = await createChannel(newState)
                console.log(`Created personal channel for switcher: ${channelName}`)
            } catch (error) {
                console.error('Error creating channel for switcher:', error)
            }
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

    const channelName = `${member.user.username}'s Room`

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

export function deleteEmptyTempVCEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState: VoiceState) => {
        if (oldState.channel && tempChannels.has(oldState.channel.id)) {
            const channel = oldState.channel

            if (channel.members.size === 0) {
                await channel.delete().catch(() => {})
                tempChannels.delete(channel.id)
            }
        }
    })
}
