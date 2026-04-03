import type { AudioReceiveStream } from '@discordjs/voice'
import type { LiveServerMessage, Session } from '@google/genai'

import { AudioPlayerStatus, StreamType } from '@discordjs/voice'
import { createAudioResource, EndBehaviorType, VoiceConnectionStatus } from '@discordjs/voice'
import { GoogleGenAI } from '@google/genai'
import prism from 'prism-media'
import { Writable, PassThrough } from 'stream'
import { pipeline } from 'stream/promises'

import {
    apiKey,
    config,
    guildConnections,
    inititialMessageFriend,
    model,
    type GuildConnectionState,
} from '@/features/ai/config'
import { downsample48To16, upsample24MonoTo48Stereo } from '@/features/ai/gemini/audio'
import { client } from '@/shared/config/client'

export function clearOutputStream(guildState: GuildConnectionState) {
    if (guildState.outputStream && !guildState.outputStream.destroyed) {
        guildState.outputStream.destroy()
    }
    guildState.outputStream = undefined
}

export function clearAiSession(guildState: GuildConnectionState) {
    if (guildState.aiSession) {
        guildState.aiSession.close()
        guildState.aiSession = undefined
    }
}

export function clearAiPrompt(guildState: GuildConnectionState) {
    if (guildState.customPrompt) {
        guildState.customPrompt = undefined
    }
}

function playAudioFromAi(guildState: GuildConnectionState, audioBuffer: Buffer) {
    if (guildState.audioPlayer.state.status === AudioPlayerStatus.Idle) {
        clearOutputStream(guildState)
    }

    if (!guildState.outputStream) {
        console.log('Starting new AI audio stream ...')

        guildState.outputStream = new PassThrough()
        const audioResource = createAudioResource(guildState.outputStream, {
            inputType: StreamType.Raw,
        })
        guildState.audioPlayer.play(audioResource)

        audioResource.playStream.on('end', () => {
            console.log('Audio resource ended')
            clearOutputStream(guildState)
        })
    }

    const readyForDiscordBuffer = upsample24MonoTo48Stereo(audioBuffer)
    guildState.outputStream.write(readyForDiscordBuffer)
}

async function modelTurnFromAi(guildState: GuildConnectionState, message: LiveServerMessage) {
    const parts = message.serverContent?.modelTurn?.parts
    if (!parts) {
        console.log('waiting for parts | parts missing')
        return
    }

    for (const part of parts) {
        if (part.inlineData) {
            const dataFromModel = () =>
                part.inlineData?.data ?? `${console.log('no data from model')}`
            const audioBuffer = Buffer.from(dataFromModel(), 'base64')
            playAudioFromAi(guildState, audioBuffer)
        } else if (part.text) {
            console.log('AI sent text response:', part.text)
        }
    }
}

export async function initAiSession(guildState: GuildConnectionState): Promise<Session> {
    clearAiSession(guildState)

    const ai = new GoogleGenAI({ apiKey })
    const session = await ai.live.connect({
        model,
        callbacks: {
            onopen() {
                console.debug('AI Session Opened')
            },
            onmessage(message: LiveServerMessage) {
                modelTurnFromAi(guildState, message).catch(console.error)
            },
            onerror(e: ErrorEvent) {
                console.debug('AI Error:', e.message)
            },
            onclose(e: CloseEvent) {
                console.debug('AI Session Closed:', e.reason)
            },
        },
        config,
    })

    guildState.aiSession = session
    return session
}

async function processAudioToAi(guildState: GuildConnectionState, botReceiver: AudioReceiveStream) {
    if (!guildState.aiSession) return

    const opusDecoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 1,
        frameSize: 960,
    })
    const pcmCollector = new Writable({
        write(chunk: Buffer, encoding, callback) {
            if (!guildState.aiSession) return callback()

            const resampled = downsample48To16(chunk)

            try {
                guildState.aiSession.sendRealtimeInput({
                    audio: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: resampled.toString('base64'),
                    },
                })
            } catch (err) {
                console.error('Failed to send chunk', err)
            }
            callback()
        },
    })

    pipeline(botReceiver, opusDecoder, pcmCollector).catch(err => {
        if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error('Pipeline error:', err)
        }
    })

    botReceiver.once('end', () => {
        if (!guildState.aiSession) return

        console.log('User stopped speaking, triggering Gemini response...')
        const silenceBuffer = Buffer.alloc(16000)

        guildState.aiSession.sendRealtimeInput({
            audio: {
                mimeType: 'audio/pcm;rate=16000',
                data: silenceBuffer.toString('base64'),
            },
        })
    })
}

export function botAudioToAi(guildState: GuildConnectionState) {
    const { voiceConnection, inputStream } = guildState
    const receiver = voiceConnection.receiver

    receiver.speaking.on('start', async (userId: string) => {
        if (userId === client.user?.id) return

        const existingStream = inputStream.get(userId)
        if (existingStream && !existingStream.destroyed) {
            return
        }

        const botReceiver = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 200,
            },
        })

        console.log(`User ${userId} started speaking`)

        inputStream.set(userId, botReceiver)

        botReceiver.once('end', () => {
            if (inputStream.get(userId) === botReceiver) {
                inputStream.delete(userId)
            }
        })

        await processAudioToAi(guildState, botReceiver)
    })
}

export function sendInitMessageToAi(guildState: GuildConnectionState) {
    guildState.aiSession?.sendClientContent({ turns: inititialMessageFriend })
}

export async function cleanupGuildConnection(guildId: string, reason: string = 'Unknown reason') {
    console.log(`Cleaning up connection for guild ${guildId}: ${reason}`)

    const guildState = guildConnections.get(guildId)
    if (!guildState) return

    guildState.inputStream.forEach(stream => {
        try {
            stream.destroy()
        } catch (err) {
            console.error('Error destroying input stream:', err)
        }
    })
    guildState.inputStream.clear()
    guildState.audioPlayer.stop()
    clearAiSession(guildState)
    clearOutputStream(guildState)
    clearAiPrompt(guildState)

    try {
        if (guildState.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            guildState.voiceConnection.destroy()
        }
    } catch (err) {
        console.error('Error destroying voice connection:', err)
    }

    guildConnections.delete(guildId)

    console.log(`✅ Cleanup completed for guild ${guildId}`)
}
