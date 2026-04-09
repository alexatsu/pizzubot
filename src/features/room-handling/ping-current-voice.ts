import type { CacheType } from 'discord.js'

import { SlashCommandBuilder, type CommandInteraction, type GuildMember } from 'discord.js'

import { type CommandHandler, CommandType } from '@/shared/lib/interaction-events/commands'

export enum PingCommand {
    PingVC = 'pingvc',
}

export const pingCommandsREST = [
    new SlashCommandBuilder()
        .setName(PingCommand.PingVC)
        .setDescription('пинганет всех в текущем войсе'),
].map(c => c.toJSON())

export const pingCommands: Record<PingCommand, CommandHandler> = {
    [PingCommand.PingVC]: { type: CommandType.Base, handler: pingCurrentVCCommand },
}

export function pingCurrentVCCommand(interaction: CommandInteraction<CacheType>) {
    const voiceChannel = (interaction.member as GuildMember).voice.channel

    if (!voiceChannel) {
        return interaction.reply('❌ You must be in a voice channel to use this!')
    }

    const members = voiceChannel.members

    if (members.size === 0) {
        return interaction.reply('❌ No one is in your voice channel.')
    }

    if (members.size === 1) {
        return interaction.reply('ℹ️ You are alone in this voice channel.')
    }

    const others = members.filter(m => m.id !== interaction.user.id)

    if (others.size === 0) {
        return interaction.reply('ℹ️ No one else is in your voice channel.')
    }

    const mentions = Array.from(others.values())
        .map(m => `<@${m.id}>`)
        .join(' ')
    const message = `🔊 **VC Ping**: ${mentions}`

    return interaction.reply(message)
}
