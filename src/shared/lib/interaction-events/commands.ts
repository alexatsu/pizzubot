import type { CacheType } from 'discord.js'

import {
    Events,
    type ChatInputCommandInteraction,
    type CommandInteraction,
    type InteractionResponse,
} from 'discord.js'

import { client } from '@/shared/config/client'

export enum CommandType {
    Chat = 'chat',
    Base = 'base',
}

export type CommandHandler =
    | {
          type: CommandType.Chat
          handler: (
              interaction: ChatInputCommandInteraction<CacheType>,
          ) => Promise<InteractionResponse<boolean> | void | undefined>
      }
    | {
          type: CommandType.Base
          handler: (
              interaction: CommandInteraction<CacheType>,
          ) => Promise<InteractionResponse<boolean> | void | undefined>
      }

export function commandsEvent(handlers: { [key: string]: CommandHandler }) {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isCommand()) return

        const commandHandler = handlers[interaction.commandName]
        if (commandHandler) {
            try {
                if (commandHandler.type === CommandType.Chat && interaction.isChatInputCommand()) {
                    await commandHandler.handler(interaction)
                } else if (commandHandler.type === CommandType.Base) {
                    await commandHandler.handler(interaction)
                }
            } catch (error) {
                console.error(`Error: ${error}`)
                if (!interaction.replied) {
                    await interaction.reply({ content: '❌ Error!', ephemeral: true })
                }
            }
        }
    })
}
