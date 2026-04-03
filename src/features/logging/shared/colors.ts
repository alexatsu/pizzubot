import type { ColorResolvable } from 'discord.js'

export const LogEventTypes = {
    USER_JOIN: 'USER_JOIN',
    USER_LEAVE: 'USER_LEAVE',

    USER_MOVE: 'USER_MOVE',
    ROLE_ADD: 'ROLE_ADD',
    ROLE_REMOVE: 'ROLE_REMOVE',

    MESSAGE_DELETE: 'MESSAGE_DELETE',
    MESSAGE_EDIT: 'MESSAGE_EDIT',

    USER_STREAM_START: 'USER_STREAM_START',
    USER_STREAM_STOP: 'USER_STREAM_STOP',

    MEMBER_KICK: 'MEMBER_KICK',
    MEMBER_JOIN: 'MEMBER_JOIN',

    NICKNAME_CHANGED: 'NICKNAME_CHANGED',
    NICKNAME_SET: 'NICKNAME_SET',
    NICKNAME_REMOVED: 'NICKNAME_REMOVED',
} as const

export type LogEventType = (typeof LogEventTypes)[keyof typeof LogEventTypes]

const LOG_COLORS: Record<LogEventType, ColorResolvable> = {
    [LogEventTypes.USER_JOIN]: '#43B581', // Green
    [LogEventTypes.USER_LEAVE]: '#F04747', // Red
    [LogEventTypes.USER_MOVE]: '#FAA61A', // Orange

    [LogEventTypes.ROLE_ADD]: '#7289DA', // Blurple
    [LogEventTypes.ROLE_REMOVE]: '#FF73FA', // Pink

    [LogEventTypes.MESSAGE_DELETE]: '#F04747', // Red
    [LogEventTypes.MESSAGE_EDIT]: '#00FFFF', // Cyan

    [LogEventTypes.USER_STREAM_START]: '#9147FF', // Purple (Twitch color)
    [LogEventTypes.USER_STREAM_STOP]: '#FF4500', // OrangeRed

    [LogEventTypes.MEMBER_KICK]: '#FF0000', // Red for kick
    [LogEventTypes.MEMBER_JOIN]: '#43B581', // Green for joins

    [LogEventTypes.NICKNAME_CHANGED]: '#7289DA', // Blue
    [LogEventTypes.NICKNAME_SET]: '#43B581', // Green
    [LogEventTypes.NICKNAME_REMOVED]: '#ffffff', // White
}

export function getLogColor(eventType: LogEventType): ColorResolvable {
    return LOG_COLORS[eventType]
}
