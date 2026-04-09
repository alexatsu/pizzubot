import { Events } from 'discord.js'
import { client } from '@/shared/config/client'
import { ensureUser } from '@/shared/prisma/user'
import { prisma } from '@/shared/prisma/client'

export enum RewardType {
    ByVoiceActivity = 3,
    ByMessage = 1,
}

export const rewardToSlices: Record<RewardType, number> = {
    [RewardType.ByMessage]: 1,
    [RewardType.ByVoiceActivity]: 3,
}

export const monthlyLimit = 150

const voiceTimers = new Map<string, Date>()
const thirtyMinutes = 30 * 60 * 1000

function getMonthKey() {
    return new Date().toISOString().slice(0, 7)
}

export async function addReward(userId: string, rewardType: RewardType, customSlices?: number) {
    const monthlyKey = getMonthKey()
    const rewardSlices = customSlices ?? rewardToSlices[rewardType]

    const existing = await prisma.wallet.findFirst({
        where: { userId },
    })

    if (!existing) {
        console.error(`Wallet not found for user ${userId}`)
        return
    }

    const isNewMonth = existing.monthlyKey !== monthlyKey
    const currentMonthlySlices = isNewMonth ? 0 : existing.monthlySlicesEarned
    const remainingSlices = Math.max(0, monthlyLimit - currentMonthlySlices)
    const slicesToAdd = Math.min(rewardSlices, remainingSlices)

    if (slicesToAdd === 0) {
        if (isNewMonth) {
            await prisma.wallet.update({
                where: { userId },
                data: {
                    monthlyKey,
                    monthlySlicesEarned: 0,
                },
            })
        }
        return
    }

    if (isNewMonth) {
        await prisma.wallet.update({
            where: { userId },
            data: {
                pizzuslices: { increment: slicesToAdd },
                monthlySlicesEarned: slicesToAdd,
                monthlyKey,
            },
        })
    } else {
        await prisma.wallet.update({
            where: { userId },
            data: {
                pizzuslices: { increment: slicesToAdd },
                monthlySlicesEarned: { increment: slicesToAdd },
                monthlyKey,
            },
        })
    }

    console.log(`Added ${slicesToAdd} slices for user ${userId} (${rewardType})`)
}

export function earnSlicesByCreateMessageEvent() {
    client.on(Events.MessageCreate, async message => {
        try {
            const isServer = message.guild
            const isBot = message.author?.bot
            const isTextBased = message.channel.isTextBased()

            if (!isServer) return
            if (isBot) return
            if (!isTextBased) return

            const discordUserId = message.author.id

            const userId = await ensureUser(discordUserId)
            await addReward(userId, RewardType.ByMessage)
        } catch (error) {
            console.error('Error handling message edit:', error)
        }
    })
}

const shouldEarnReward = async (intervalsEarned: number, discordUserId: string) => {
    try {
        if (intervalsEarned > 0) {
            const totalSlices = intervalsEarned * rewardToSlices[RewardType.ByVoiceActivity]

            const userId = await ensureUser(discordUserId)
            await addReward(userId, RewardType.ByVoiceActivity, totalSlices)

            console.log(
                `User left voice, earned ${intervalsEarned} intervals (${totalSlices} slices)`,
            )
        }
    } catch (error) {
        console.error(`Error earning reward for user ${discordUserId}:`, error)
    }
}

const processTimeSpent = async (joinTime: Date | undefined, discordUserId: string, key: string) => {
    try {
        if (joinTime) {
            const leaveTime = new Date()
            const timeSpent = leaveTime.getTime() - joinTime.getTime()
            const intervalsEarned = Math.floor(timeSpent / thirtyMinutes)

            await shouldEarnReward(intervalsEarned, discordUserId)
            voiceTimers.delete(key)
        }
    } catch (error) {
        console.error(`Error processing time spent for user ${discordUserId}:`, error)
    }
}

export function earnSlicesByVoiceActivityEvent() {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        try {
            const member = newState.member ?? oldState.member
            if (!member || member.user.bot) return

            const discordUserId = member.user.id
            const key = `${member.guild.id}:${discordUserId}`

            const wasInVoice = Boolean(oldState.channelId)
            const isInVoice = Boolean(newState.channelId)

            if (!wasInVoice && isInVoice) {
                voiceTimers.set(key, new Date())
                console.log(`User ${discordUserId} joined voice channel at ${voiceTimers.get(key)}`)
            }

            if (wasInVoice && !isInVoice) {
                const joinTime = voiceTimers.get(key)
                await processTimeSpent(joinTime, discordUserId, key)
            }
        } catch (error) {
            console.error('Error handling voice state update:', error)
        }
    })
}
