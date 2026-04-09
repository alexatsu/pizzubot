import type { User } from '@/shared/prisma/generated/client'

import { prisma } from '@/shared/prisma/client'

export async function ensureUser(discordUserId: User['discordUserId']) {
    const existingUser = await prisma.user.findFirst({
        where: { discordUserId },
        select: { id: true },
    })
    if (existingUser) return existingUser.id

    const uuid = crypto.randomUUID()

    const createdUser = await prisma.user.create({
        data: {
            id: uuid,
            discordUserId,
            wallet: {
                create: {
                    userId: uuid,
                    monthlyKey: new Date().toISOString().slice(0, 7),
                },
            },
        },
        select: { id: true },
    })
    return createdUser.id
}
