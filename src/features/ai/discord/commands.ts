import type { ChatInputCommandInteraction, CommandInteraction, GuildMember } from 'discord.js'

import {
    getVoiceConnection,
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus,
    createAudioPlayer,
} from '@discordjs/voice'
import { SlashCommandBuilder, type CacheType } from 'discord.js'
import {
    type GuildConnectionState,
    config,
    guildConnections,
    inititialMessageAngry,
    inititialMessageFriend,
    roles,
    voices,
} from '@/features/ai/config'
import {
    clearAiPrompt,
    initAiSession,
    sendInitMessageToAi,
    botAudioToAi,
    cleanupGuildConnection,
    clearAiSession,
    clearOutputStream,
} from '@/features/ai/gemini/core'
import { CommandType, type CommandHandler } from '@/shared/lib/interaction-events/commands'

export enum AiCommands {
    Join = 'ai-join',
    Leave = 'ai-leave',
    Reset = 'ai-reset',
    Roles = 'ai-roles',
    SetRole = 'ai-set-role',
    CurrentRole = 'ai-current-role',
    Voices = 'ai-voices',
    SetVoice = 'ai-set-voice',
    Prompt = 'ai-prompt',
}

export const aiCommandsREST = [
    new SlashCommandBuilder().setName(AiCommands.Join).setDescription('бот зайдет в войс'),
    new SlashCommandBuilder().setName(AiCommands.Leave).setDescription('бот выйдет из войса'),
    new SlashCommandBuilder().setName(AiCommands.Reset).setDescription('перезапустить контекст ии'),
    new SlashCommandBuilder().setName(AiCommands.Roles).setDescription('показать доступные роли'),
    new SlashCommandBuilder()
        .setName(AiCommands.SetRole)
        .setDescription('поменять роль')
        .addStringOption(option =>
            option
                .setName('role')
                .setDescription('выберите')
                .setRequired(true)
                .addChoices(
                    { name: 'друг', value: 'друг' },
                    { name: 'строгий учитель', value: 'строгий учитель' },
                    { name: 'пьяный сосед', value: 'пьяный сосед' },
                    { name: 'хитрый босс', value: 'хитрый босс' },
                    { name: 'циничный бармен', value: 'циничный бармен' },
                    { name: 'злая бабушка', value: 'злая бабушка' },
                    { name: 'уличный гангстер', value: 'уличный гангстер' },
                    { name: 'сноб-критик', value: 'сноб-критик' },
                    { name: 'бывшая подруга', value: 'бывшая подруга' },
                    { name: 'коррумпированный коп', value: 'коррумпированный коп' },
                ),
        ),

    new SlashCommandBuilder()
        .setName(AiCommands.CurrentRole)
        .setDescription('показать текущую роль'),
    new SlashCommandBuilder()
        .setName(AiCommands.Voices)
        .setDescription('показать доступные голоса'),
    new SlashCommandBuilder()
        .setName(AiCommands.SetVoice)
        .setDescription('поменять голос')
        .addStringOption(option =>
            option
                .setName('voice')
                .setDescription('выберите голос')
                .setRequired(true)
                .addChoices(
                    ...voices.map(voice => ({
                        name: `${voice.name} - ${voice.description}`,
                        value: voice.name,
                    })),
                ),
        ),
    new SlashCommandBuilder()
        .setName(AiCommands.Prompt)
        .setDescription('дать AI временную инструкцию как себя вести')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('напишите инструкцию для AI (макс 500 символов)')
                .setRequired(true)
                .setMaxLength(500),
        ),
].map(c => c.toJSON())

export const aiCommands: Record<AiCommands, CommandHandler> = {
    [AiCommands.Join]: { type: CommandType.Base, handler: aiJoinCommand },
    [AiCommands.Leave]: { type: CommandType.Base, handler: aiLeaveCommand },
    [AiCommands.Reset]: { type: CommandType.Base, handler: aiResetCommand },
    [AiCommands.Roles]: { type: CommandType.Base, handler: aiRolesCommand },
    [AiCommands.SetRole]: { type: CommandType.Chat, handler: aiSetRoleCommand },
    [AiCommands.CurrentRole]: { type: CommandType.Base, handler: aiCurrentRoleCommand },
    [AiCommands.Voices]: { type: CommandType.Base, handler: aiVoicesCommand },
    [AiCommands.SetVoice]: { type: CommandType.Chat, handler: aiSetVoiceCommand },
    [AiCommands.Prompt]: { type: CommandType.Chat, handler: aiPromptCommand },
}

async function aiJoinCommand(interaction: CommandInteraction<CacheType>) {
    const member = interaction.member as GuildMember
    const voiceChannel = member.voice.channel

    if (!voiceChannel) {
        return interaction.reply('Please join a voice channel first!')
    }

    const existing = getVoiceConnection(voiceChannel.guild.id)
    if (existing) {
        return interaction.reply('Already connected to a voice channel!')
    }

    try {
        const voiceConnection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        })

        await entersState(voiceConnection, VoiceConnectionStatus.Ready, 30_000)

        const audioPlayer = createAudioPlayer()
        voiceConnection.subscribe(audioPlayer)

        const guildState: GuildConnectionState = {
            voiceConnection,
            audioPlayer,
            inputStream: new Map(),
            currentRoleIndex: 0,
        }

        guildConnections.set(voiceChannel.guild.id, guildState)

        audioPlayer.on('error', error => {
            console.error('Audio player error:', error)
        })

        clearAiPrompt(guildState)
        await initAiSession(guildState)
        sendInitMessageToAi(guildState)
        botAudioToAi(guildState)

        await interaction.reply(`✅ Подключился к **${voiceChannel.name}** и слушаю вас!`)
    } catch (error) {
        console.error('Failed to join voice channel:', error)
        await interaction.reply('❌ Failed to join voice channel!')
    }
}

async function aiLeaveCommand(interaction: CommandInteraction<CacheType>) {
    const guildId = interaction.guild?.id
    if (!guildId) return

    await cleanupGuildConnection(guildId, 'User requested leave')
    await interaction.reply('👋 Ушел отдыхать!')
}

async function aiResetCommand(interaction: CommandInteraction<CacheType>) {
    const guildId = interaction.guild?.id
    if (!guildId) {
        return interaction.reply('No guild found!')
    }

    const guildState = guildConnections.get(guildId)
    if (!guildState) {
        return interaction.reply('Not connected to any voice channel!')
    }

    try {
        clearAiPrompt(guildState)
        clearAiSession(guildState)
        clearOutputStream(guildState)
        guildState.audioPlayer.stop()
        await initAiSession(guildState)
        sendInitMessageToAi(guildState)

        await interaction.reply('🔄 Перезапуск ии агента выполнен!')
        console.log(`AI reset for guild ${guildId}`)
    } catch (error) {
        console.error('Failed to reset AI:', error)
        await interaction.reply('❌ Failed to reset AI!')
    }
}

async function aiRolesCommand(interaction: CommandInteraction<CacheType>) {
    const rolesList = roles
        .map((role, index) => `**${index + 1}. ${role.name}**\n${role.description}`)
        .join('\n\n')
    const rolesEmbed = {
        title: '🎭 Доступные роли',
        description: `Выбери роли через \`/ai-set-role <role_name>\`\n\n${rolesList}`,
        color: 0x00ff00,
        footer: { text: 'User consented to all role tones' },
    }

    await interaction.reply({ embeds: [rolesEmbed] })
}

async function aiSetRoleCommand(interaction: ChatInputCommandInteraction<CacheType>) {
    const guildId = interaction.guild?.id
    if (!guildId) {
        return interaction.reply('No guild found!')
    }

    const guildState = guildConnections.get(guildId)
    if (!guildState) {
        return interaction.reply('❌ Не подключен к войсу! Используй `/ai-join` сначала.')
    }

    const roleName = interaction.options.getString('role', true)
    const selectedRole = roles.find(role => role.name.toLowerCase() === roleName.toLowerCase())

    if (!selectedRole) {
        const availableRoles = roles.map(r => `\`${r.name}\``).join(', ')
        return interaction.reply(
            `❌ Роль "${roleName}" не найдена!\n\nДоступные роли: ${availableRoles}\nИспользуй \`/ai-roles\` чтобы посмотреть все.`,
        )
    }

    try {
        clearAiPrompt(guildState)

        config.systemInstruction = {
            parts: [{ text: selectedRole.description }],
        }
        config.speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: selectedRole.voiceName,
                },
            },
        }
        guildState.currentRoleIndex = roles.findIndex(r => r.name === selectedRole.name)

        clearAiSession(guildState)
        clearOutputStream(guildState)
        guildState.audioPlayer.stop()

        const session = await initAiSession(guildState)
        const initMessage = `Теперь ты ${selectedRole.name}. ${selectedRole.description.split('Тон:')[1]?.trim() || ''} 
        ${guildState.currentRoleIndex === 0 ? inititialMessageFriend : inititialMessageAngry}`

        session.sendClientContent({
            turns: initMessage,
        })

        const roleEmbed = {
            title: '🎭 Поменял роль успешно',
            description: `**Новая роль:** ${selectedRole.name}\n\n**Описание:** ${selectedRole.description}`,
            color: 0x00ff00,
            footer: { text: 'Ии теперь будет играть новую роль!' },
        }

        await interaction.reply({ embeds: [roleEmbed] })
        console.log(`Role changed to "${selectedRole.name}" for guild ${guildId}`)
    } catch (error) {
        console.error('Failed to set role:', error)
        await interaction.reply('❌ Failed to change AI role!')
    }
}

async function aiCurrentRoleCommand(interaction: CommandInteraction<CacheType>) {
    const guildId = interaction.guild?.id
    if (!guildId) {
        return interaction.reply('No guild found!')
    }

    const guildState = guildConnections.get(guildId)
    if (!guildState) {
        return interaction.reply('❌ Бот не подключен к войсу! Используй `/ai-join`.')
    }

    const currentRole = roles[guildState.currentRoleIndex]
    const roleEmbed = {
        title: '🎭 Текущая ии роль',
        description: `**Роль:** ${currentRole.name}\n\n**Описание:** ${currentRole.description}`,
        color: 0x00ff00,
        footer: { text: 'Используй /ai-roles чтобы глянуть доступные' },
    }

    await interaction.reply({ embeds: [roleEmbed] })
}

async function aiVoicesCommand(interaction: CommandInteraction<CacheType>) {
    const voicesList = voices
        .map((voice, index) => `**${index + 1}. ${voice.name}**\n${voice.description}`)
        .join('\n\n')

    const voicesEmbed = {
        title: '🎤 Доступные голоса',
        description: voicesList,
        color: 0x00ffff,
        footer: { text: 'Голоса используются для озвучки разных ролей' },
    }

    await interaction.reply({ embeds: [voicesEmbed] })
}

async function aiSetVoiceCommand(interaction: ChatInputCommandInteraction<CacheType>) {
    const guildId = interaction.guild?.id
    if (!guildId) {
        return interaction.reply('No guild found!')
    }

    const guildState = guildConnections.get(guildId)
    if (!guildState) {
        return interaction.reply('❌ Не подключен к войсу! Используй `/ai-join` сначала.')
    }

    const voiceName = interaction.options.getString('voice', true)
    const selectedVoice = voices.find(voice => voice.name === voiceName)

    if (!selectedVoice) {
        return interaction.reply(
            `❌ Голос "${voiceName}" не найден! Используй \`/ai-voices\` чтобы посмотреть доступные голоса.`,
        )
    }

    try {
        config.speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: selectedVoice.name,
                },
            },
        }
        guildState.currentVoiceName = selectedVoice.name

        clearAiSession(guildState)
        clearOutputStream(guildState)
        guildState.audioPlayer.stop()

        const session = await initAiSession(guildState)

        const currentRole = roles[guildState.currentRoleIndex]
        const initMessage = `Теперь ты ${currentRole.name}. ${currentRole.description.split('Тон:')[1]?.trim() || ''} 
        ${guildState.currentRoleIndex === 0 ? inititialMessageFriend : inititialMessageAngry}`

        session.sendClientContent({
            turns: initMessage,
        })

        const voiceEmbed = {
            title: '🎤 Голос успешно изменен',
            description: `**Новый голос:** ${selectedVoice.name}\n\n**Описание:** ${selectedVoice.description}`,
            color: 0x00ffff,
            footer: { text: 'Ии теперь говорит новым голосом!' },
        }

        await interaction.reply({ embeds: [voiceEmbed] })
        console.log(`Voice changed to "${selectedVoice.name}" for guild ${guildId}`)
    } catch (error) {
        console.error('Failed to set voice:', error)
        await interaction.reply('❌ Failed to change AI voice!')
    }
}

async function aiPromptCommand(interaction: ChatInputCommandInteraction<CacheType>) {
    const guildId = interaction.guild?.id
    if (!guildId) {
        return interaction.reply('No guild found!')
    }

    const guildState = guildConnections.get(guildId)
    if (!guildState) {
        return interaction.reply('❌ Не подключен к войсу! Используй `/ai-join` сначала.')
    }

    const prompt = interaction.options.getString('prompt', true)

    try {
        guildState.customPrompt = prompt

        clearAiSession(guildState)
        clearOutputStream(guildState)
        guildState.audioPlayer.stop()

        const session = await initAiSession(guildState)
        const currentRole = roles[guildState.currentRoleIndex]
        const initMessage = `Ты ${currentRole.name}. ${currentRole.description.split('Тон:')[1]?.trim() || ''}
        ИНСТРУКЦИЯ НА ЭТУ СЕССИЮ: ${prompt}
        ${inititialMessageFriend}`

        session.sendClientContent({
            turns: initMessage,
        })

        const promptEmbed = {
            title: '🤖 Временная инструкция применена',
            description: `**Инструкция:**\n${prompt}`,
            color: 0x9b59b6,
            fields: [
                {
                    name: '🎭 Роль',
                    value: currentRole.name,
                    inline: true,
                },
                {
                    name: '⏱️ Действует',
                    value: 'до смены роли или перезапуска',
                    inline: true,
                },
            ],
            footer: { text: 'Инструкция автоматически очистится при смене роли или перезапуске' },
        }

        await interaction.reply({ embeds: [promptEmbed] })
        console.log(`Custom prompt applied for guild ${guildId}: ${prompt}`)
    } catch (error) {
        console.error('Failed to apply custom prompt:', error)
        await interaction.reply('❌ Не удалось применить инструкцию!')
    }
}
