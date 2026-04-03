import { deleteMessageEvent } from '@/features/logging/messages/delete'
import { editMessageEvent } from '@/features/logging/messages/edit'
import { banUserEvent } from '@/features/logging/moderation/ban'
import { changeNicknameEvent } from '@/features/logging/moderation/change-nickname'
import { handleInvitesEvent } from '@/features/logging/moderation/invites'
import { kickUserEvent } from '@/features/logging/moderation/kick'
import { roleUpdateEvent } from '@/features/logging/moderation/roles'
import { voiceStateUpdateEvent } from '@/features/logging/voice/state'
import { voiceStreamingEvent } from '@/features/logging/voice/streaming'

export function featureLogging() {
    editMessageEvent()
    deleteMessageEvent()

    banUserEvent()
    changeNicknameEvent()
    handleInvitesEvent()
    kickUserEvent()
    roleUpdateEvent()

    voiceStateUpdateEvent()
    voiceStreamingEvent()
}
