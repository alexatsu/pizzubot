import type { ModalSubmitInteraction, InteractionResponse } from 'discord.js'

import { type CacheType, Events } from 'discord.js'

import { client } from '@/shared/config/client'

export type ModalHandler = (
    interaction: ModalSubmitInteraction<CacheType>,
) => Promise<InteractionResponse<boolean> | void | undefined>

export function modalEvent(handlers: { [key: string]: ModalHandler }) {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isModalSubmit()) return

        const modalHandler = handlers[interaction.customId]
        if (!modalHandler) return

        try {
            await modalHandler(interaction)
        } catch (error) {
            console.error(`Error: ${error}`)
        }
    })
}
