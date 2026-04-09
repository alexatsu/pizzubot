import { earningSlicesService } from '@/features/economy/earning-slices'
import { shopRolesService } from '@/features/economy/shop/roles'
import { walletService } from '@/features/economy/wallet'

export function economyFeature() {
    earningSlicesService()
    walletService()
    shopRolesService()
}
