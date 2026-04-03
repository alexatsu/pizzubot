import { EmbedBuilder, type ColorResolvable } from 'discord.js'

export function createVoiceEmbed(
    title: string,
    description: string,
    color: ColorResolvable,
    thumbnail?: string,
) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()

    if (thumbnail) {
        embed.setThumbnail(thumbnail)
    }

    return embed
}
