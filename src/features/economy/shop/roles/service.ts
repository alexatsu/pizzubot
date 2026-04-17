import type { CommandInteraction, ModalSubmitInteraction } from 'discord.js'

import {
    GuildMember,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    type CacheType,
} from 'discord.js'

import type { ModalHandler } from '@/shared/lib/interaction-events/modal'

import { type CommandHandler, CommandType } from '@/shared/lib/interaction-events/commands'
import { prisma } from '@/shared/prisma/client'
import { RoleType } from '@/shared/prisma/generated/enums'
import { ensureUser } from '@/shared/prisma/user'

const roleCost = 50 //50 pizzuslices for 1 role
const roleLimit = 3

export enum ShopRolesCommands {
    Buy = 'shop-role-buy',
    Swap = 'shop-role-swap',
}

export enum ShopRolesModals {
    Buy = 'shop-role-buy-modal',
    Swap = 'shop-role-swap-modal',
}

export const shopRoleCommandsREST = [
    new SlashCommandBuilder()
        .setName(ShopRolesCommands.Buy)
        .setDescription(`купить роль, 1 роль = ${roleCost} pizzuslices`),
    new SlashCommandBuilder()
        .setName(ShopRolesCommands.Swap)
        .setDescription(`поменять роль, стоит ${roleCost} pizzuslices`),
].map(c => c.toJSON())

export const shopRolesCommands: Record<ShopRolesCommands, CommandHandler> = {
    [ShopRolesCommands.Buy]: { type: CommandType.Base, handler: shopRolesBuyCommand },
    [ShopRolesCommands.Swap]: { type: CommandType.Base, handler: shopRolesSwapCommand },
}

export const shopRolesModals: Record<ShopRolesModals, ModalHandler> = {
    [ShopRolesModals.Buy]: shopRolesBuyModal,
    [ShopRolesModals.Swap]: shopRolesSwapModal,
}

async function shopRolesBuyCommand(interaction: CommandInteraction<CacheType>) {
    const discordUserId = interaction.user.id
    const userId = await ensureUser(discordUserId)

    const balance = await prisma.wallet.findFirst({
        where: { userId },
        select: { pizzuslices: true },
    })

    if (balance && balance.pizzuslices < roleCost) {
        await interaction.reply({
            content: 'Недостаточно pizzuslices',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const roles = await prisma.role.count({
        where: { userId },
    })

    if (roles >= roleLimit) {
        await interaction.reply({
            content: 'Максимум ролей создано, чтобы заменить, используйте /shop-role-swap',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const modal = new ModalBuilder()
        .setCustomId(ShopRolesModals.Buy)
        .setTitle('Купить кастомную роль')

    const roleNameInput = new TextInputBuilder()
        .setCustomId('roleNameInput')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(true)
    const roleNameLabel = new LabelBuilder()
        .setLabel('Название роли')
        .setDescription('Кастомная роль')
        .setTextInputComponent(roleNameInput)

    const roleColorInput = new TextInputBuilder()
        .setCustomId('roleColorInput')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(true)
    const roleColorLabel = new LabelBuilder()
        .setLabel('Hex цвет, например FFAA00')
        .setDescription('цвет для кастомной роли, вводите без #')
        .setTextInputComponent(roleColorInput)

    modal.addLabelComponents([roleNameLabel, roleColorLabel])
    await interaction.showModal(modal)
}

async function shopRolesBuyModal(interaction: ModalSubmitInteraction<CacheType>) {
    const roleName = interaction.fields.getTextInputValue('roleNameInput')
    const roleColor = interaction.fields.getTextInputValue('roleColorInput')

    const member = interaction.member
    if (!member || !(member instanceof GuildMember)) {
        await interaction.reply({
            content: 'Не удалось получить участника сервера',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    if (roleName.length < 1 || roleName.length > 32) {
        await interaction.reply({
            content: 'Название роли должно быть от 1 до 32 символов',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexRegex.test(roleColor)) {
        await interaction.reply({
            content: 'Неверный формат HEX цвета. Используйте RRGGBB или RGB',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    if (roleName.includes('🍕')) {
        await interaction.reply({
            content: 'Нельзя использовать 🍕 в названии роли',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const discordUserId = interaction.user.id
    const userId = await ensureUser(discordUserId)

    const balance = await prisma.wallet.findFirst({
        where: { userId },
        select: { pizzuslices: true },
    })

    try {
        if (!balance) {
            console.log('for some reason there is no balance')
            throw new Error('failed to get balance')
        }

        const role = await interaction.guild?.roles.create({
            name: roleName,
            color: parseInt(roleColor.replace('#', ''), 16),
            reason: `Custom role purchased by ${interaction.user.tag}`,
        })

        if (!role) {
            throw new Error('Failed to create role')
        }

        await prisma.wallet.update({
            where: { userId },
            data: { pizzuslices: balance.pizzuslices - roleCost },
        })

        await prisma.role.create({
            data: { id: crypto.randomUUID(), userId, discordRoleId: role.id, roleName, roleColor },
        })

        await member.roles.add(role)

        await interaction.reply({
            content: `Роль ${roleName} успешно создана и назначена! Остаток: ${balance.pizzuslices - roleCost} pizzuslices`,
            flags: MessageFlags.Ephemeral,
        })
        return
    } catch (error) {
        console.error('Error creating role:', error)
        await interaction.reply({
            content: 'Произошла ошибка при создании роли. Пожалуйста, попробуйте позже.',
            flags: MessageFlags.Ephemeral,
        })
        return
    }
}

async function shopRolesSwapCommand(interaction: CommandInteraction<CacheType>) {
    const discordUserId = interaction.user.id
    const userId = await ensureUser(discordUserId)

    const ownedRoles = await prisma.role.count({
        where: { userId },
    })

    if (ownedRoles === 0) {
        await interaction.reply({
            content: 'У вас нет кастомных ролей для замены',
            flags: MessageFlags.Ephemeral,
        })
        return
    }
    const modal = new ModalBuilder()
        .setCustomId(ShopRolesModals.Swap)
        .setTitle('Заменить кастомную роль')

    const roles = await prisma.role.findMany({
        where: { userId, roleType: RoleType.Custom },
        select: { discordRoleId: true, roleName: true, roleColor: true },
    })

    const menu = new StringSelectMenuBuilder()
        .setCustomId('oldRoleIdInput')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            roles.map(role => ({
                label: role.roleName,
                value: role.discordRoleId,
                description: role.roleColor,
            })),
        )
    const oldRoleLabel = new LabelBuilder()
        .setLabel('ID старой роли')
        .setDescription('Роль, которую нужно заменить')
        .setStringSelectMenuComponent(menu)

    const roleNameInput = new TextInputBuilder()
        .setCustomId('roleNameInput')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(true)
    const roleNameLabel = new LabelBuilder()
        .setLabel('Новое название роли')
        .setDescription('Кастомная роль')
        .setTextInputComponent(roleNameInput)

    const roleColorInput = new TextInputBuilder()
        .setCustomId('roleColorInput')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(true)
    const roleColorLabel = new LabelBuilder()
        .setLabel('Новый HEX цвет, например FFAA00')
        .setDescription('цвет для кастомной роли, вводите без #')
        .setTextInputComponent(roleColorInput)

    modal.addLabelComponents([oldRoleLabel, roleNameLabel, roleColorLabel])
    await interaction.showModal(modal)
}

async function shopRolesSwapModal(interaction: ModalSubmitInteraction<CacheType>) {
    const [oldRoleId] = interaction.fields.getStringSelectValues('oldRoleIdInput')
    const roleName = interaction.fields.getTextInputValue('roleNameInput')
    const roleColor = interaction.fields.getTextInputValue('roleColorInput')

    const member = interaction.member
    if (!member || !(member instanceof GuildMember)) {
        await interaction.reply({
            content: 'Не удалось получить участника сервера',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    if (roleName.length < 1 || roleName.length > 32) {
        await interaction.reply({
            content: 'Название роли должно быть от 1 до 32 символов',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexRegex.test(roleColor)) {
        await interaction.reply({
            content: 'Неверный формат HEX цвета. Используйте RRGGBB или RGB',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    if (roleName.includes('🍕')) {
        await interaction.reply({
            content: 'Нельзя использовать 🍕 в названии роли',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const userId = await ensureUser(interaction.user.id)

    const ownedRole = await prisma.role.findFirst({
        where: { userId, discordRoleId: oldRoleId },
    })

    if (!ownedRole) {
        await interaction.reply({
            content: 'Эта роль вам не принадлежит или не найдена',
            flags: MessageFlags.Ephemeral,
        })
        return
    }

    const balance = await prisma.wallet.findFirst({
        where: { userId },
        select: { pizzuslices: true },
    })

    try {
        if (!balance) {
            console.log('for some reason there is no balance')
            throw new Error('failed to get balance')
        }
        const guild = interaction.guild
        if (!guild) throw new Error('GUILD_NOT_FOUND')

        const oldRole = await guild.roles.fetch(oldRoleId)
        if (!oldRole) throw new Error('OLD_ROLE_NOT_FOUND')

        const updatedDiscordRole = await guild.roles.create({
            name: roleName,
            color: parseInt(roleColor.replace('#', ''), 16),
            reason: `Custom role swapped by ${interaction.user.tag}`,
        })

        await member.roles.add(updatedDiscordRole)
        await member.roles.remove(oldRole)

        await guild.roles.delete(oldRole.id, `Custom role swapped by ${interaction.user.tag}`)

        await prisma.$transaction(async tx => {
            await tx.wallet.update({
                where: { userId },
                data: {
                    pizzuslices: balance.pizzuslices - roleCost,
                },
            })

            await tx.role.delete({
                where: { discordRoleId: ownedRole.discordRoleId },
            })

            await tx.role.create({
                data: {
                    id: crypto.randomUUID(),
                    userId,
                    discordRoleId: updatedDiscordRole.id,
                    roleName,
                    roleColor,
                },
            })
        })

        await interaction.reply({
            content: `Роль успешно заменена на ${roleName}. Списано ${roleCost} pizzuslices.`,
            flags: MessageFlags.Ephemeral,
        })
        return
    } catch (error) {
        console.error('Error swapping role:', error)
        await interaction.reply({
            content: 'Произошла ошибка при замене роли. Пожалуйста, попробуйте позже.',
            flags: MessageFlags.Ephemeral,
        })
        return
    }
}
