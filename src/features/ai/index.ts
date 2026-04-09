import { aiCommands } from "@/features/ai/discord/commands"
import { cleanupWhenDisconnectedEvent } from "@/features/ai/discord/events"
import { commandsEvent } from "@/shared/lib/interaction-events/commands"

export function featureAi() {
    commandsEvent(aiCommands)
    cleanupWhenDisconnectedEvent()
}
