import type { OmitPartialGroupDMChannel, Message, PartialMessage } from 'discord.js'

export const excludedCategories = ['1384919458136457226']

export async function isInExcludedCategory(
    message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
) {
    const channel = await message.guild?.channels.fetch(message.channelId)

    if (channel) {
        return excludedCategories.includes(channel.parentId ?? '')
    }
}
