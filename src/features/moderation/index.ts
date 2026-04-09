import { autoRoleEvent } from '@/features/moderation/auto-role'
import { memberOffboardingEvent } from '@/features/moderation/member-offboarding'

export function featureModeration() {
    autoRoleEvent()
    memberOffboardingEvent()
}
