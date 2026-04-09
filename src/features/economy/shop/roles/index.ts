import { shopRolesCommands, shopRolesModals } from '@/features/economy/shop/roles/service'
import { commandsEvent } from '@/shared/lib/interaction-events/commands'
import { modalEvent } from '@/shared/lib/interaction-events/modal'

export function shopRolesService() {
    commandsEvent(shopRolesCommands)
    modalEvent(shopRolesModals)
}
