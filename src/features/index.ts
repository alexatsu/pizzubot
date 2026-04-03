import { featureAi } from '@/features/ai'
import { featureLogging } from '@/features/logging'
import { featureModeration } from '@/features/moderation'
import { featureRoomHandler } from '@/features/room-handling'

export function initFeatures() {
    featureLogging()
    featureModeration()
    featureRoomHandler()
    featureAi()
}
