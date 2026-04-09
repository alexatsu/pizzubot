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
