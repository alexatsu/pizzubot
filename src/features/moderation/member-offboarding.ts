import { Events } from 'discord.js'

import { client } from '@/shared/config/client'
import { prisma } from '@/shared/prisma/client'
import { RoleType } from '@/shared/prisma/generated/enums'

async function removeUserFromDb(discordUserId: string) {
    const user = await prisma.user.findUnique({
        where: { discordUserId },
        select: { id: true },
    })

    if (!user) {
        console.log('user not found')
        throw new Error('User not found')
    }

    const customRoles = await prisma.role.findMany({
        where: {
            userId: user.id,
            roleType: RoleType.Custom,
        },
        select: { discordRoleId: true },
    })

    const guild = client.guilds.cache.first()
    if (guild) {
        const member = await guild.members.fetch(discordUserId).catch(() => null)

        if (member) {
            const roleIds = customRoles.map(r => r.discordRoleId)
            if (roleIds.length > 0) {
                await member.roles.remove(roleIds)
            }
        }
    }

    await prisma.role.deleteMany({
        where: {
            userId: user.id,
            roleType: RoleType.Custom,
        },
    })

    await prisma.user.delete({ where: { discordUserId } })
}

export function memberOffboardingEvent() {
    client.on(Events.GuildBanAdd, async ban => {
        try {
            await removeUserFromDb(ban.user.id)
            console.log(`${ban.user.tag} removed from database (ban)`)
        } catch (error) {
            console.error('Error handling ban:', error)
        }
    })

    client.on(Events.GuildMemberRemove, async member => {
        try {
            await removeUserFromDb(member.user.id)
            console.log(`${member.user.tag} removed from database (leave/kick)`)
        } catch (error) {
            console.error('Error handling member removal:', error)
        }
    })
}
