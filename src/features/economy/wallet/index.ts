import { walletCommands } from "@/features/economy/wallet/service";
import { commandsEvent } from "@/shared/lib/interaction-events/commands";

export function walletService() {
    commandsEvent(walletCommands)
}
