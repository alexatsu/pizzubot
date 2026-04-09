import { commandsEvent } from '@/shared/lib/interaction-events/commands'

import { createTempVCEvent } from './auto-create-voice'
import { pingCommands } from './ping-current-voice'

export function featureRoomHandler() {
    createTempVCEvent()
    commandsEvent(pingCommands)
}
