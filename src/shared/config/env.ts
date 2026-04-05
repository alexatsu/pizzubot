export const ENV = {
    TOKEN: process.env.TOKEN!,
    CLIENT_ID: process.env.CLIENT_ID!,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    GUILD_ID: process.env.GUILD_ID!
} as const

export function initValidateEnv() {
    const missingVars = Object.entries(ENV)
        .filter(([key]) => !process.env[key])
        .map(([key]) => key)

    if (missingVars.length > 0) {
        console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
        process.exit(1)
    }
}
