export const REQUIRED_ENV = {
    TOKEN: process.env.TOKEN!,
    CLIENT_ID: process.env.CLIENT_ID!,
    GUILD_ID: process.env.GUILD_ID!,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,

    DATABASE_URL: process.env.DATABASE_URL!,
    POSTGRES_USER: process.env.POSTGRES_USER!,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
    POSTGRES_DB: process.env.POSTGRES_DB!,
    POSTGRES_HOST: process.env.POSTGRES_HOST!,
    POSTGRES_PORT: process.env.POSTGRES_PORT!,
} as const

export const OPTIONAL_ENV = {
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
} as const
