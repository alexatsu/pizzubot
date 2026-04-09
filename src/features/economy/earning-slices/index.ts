import {
    earnSlicesByCreateMessageEvent,
    earnSlicesByVoiceActivityEvent,
} from '@/features/economy/earning-slices/service'

export const earningSlicesService = () => {
    earnSlicesByCreateMessageEvent()
    earnSlicesByVoiceActivityEvent()
}
