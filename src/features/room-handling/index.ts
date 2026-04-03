import { commandsEvent } from '@/shared/lib/commands'

import { createTempVCEvent, deleteEmptyTempVCEvent } from './auto-create-voice'
import { pingCommands } from './ping-current-voice'

export function featureRoomHandler() {
    createTempVCEvent()
    deleteEmptyTempVCEvent()
    commandsEvent(pingCommands)
}
