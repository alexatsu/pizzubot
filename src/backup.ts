import 'dotenv/config'
import { exec } from 'child_process'
import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'path'

import { initValidateEnv } from '@/init'
import { OPTIONAL_ENV, REQUIRED_ENV } from '@/shared/config/env'

const OAUTH_CLIENT_ID = OPTIONAL_ENV.GOOGLE_CLIENT_ID
const OAUTH_CLIENT_SECRET = OPTIONAL_ENV.GOOGLE_CLIENT_SECRET
const OAUTH_REFRESH_TOKEN = OPTIONAL_ENV.GOOGLE_REFRESH_TOKEN
const DRIVE_FOLDER_ID = '1vInPTeMrSt3Ou9jGSvnceS1MWeoUwQVR' // probably should add to env

export function hasGoogleEnvs() {
    const hasGoogleEnv =
        OPTIONAL_ENV.GOOGLE_CLIENT_ID &&
        OPTIONAL_ENV.GOOGLE_CLIENT_SECRET &&
        OPTIONAL_ENV.GOOGLE_REFRESH_TOKEN

    return !!hasGoogleEnv
}

function getDriveClient() {
    const oauth2Client = new google.auth.OAuth2(
        OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob',
    )

    oauth2Client.setCredentials({ refresh_token: OAUTH_REFRESH_TOKEN })

    return google.drive({ version: 'v3', auth: oauth2Client })
}

async function uploadToDrive(filePath: string, fileName: string) {
    try {
        const drive = getDriveClient()
        console.log('Drive client created')

        // Check if file exists and read it
        const fileStats = fs.statSync(filePath)
        console.log(`File size: ${fileStats.size} bytes`)

        const res = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: 'application/sql',
                body: fs.createReadStream(filePath),
            },
            fields: 'id',
        })

        console.log('Upload successful, file ID:', res.data.id)
        return res.data.id
    } catch (error) {
        console.error('Upload error details:', error)
        throw error
    }
}

async function cleanupOldBackups() {
    const drive = getDriveClient()

    const res = await drive.files.list({
        q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false and name contains 'backup-'`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 100,
    })

    const files = res.data.files ?? []
    const oldFiles = files.slice(2)

    for (const file of oldFiles) {
        if (!file.id) continue
        await drive.files.delete({
            fileId: file.id,
        })
        console.log('Deleted old backup:', file.name)
    }
}

export async function handleBackup() {
    if (!hasGoogleEnvs()) {
        console.log('Google backup envs not set, skipping backup')
        return
    }

    initValidateEnv()
    console.log('handleBackup started')
    const backupDir = path.resolve('backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
    const filePath = path.join(backupDir, fileName)

    const dbName = REQUIRED_ENV.POSTGRES_DB
    const dbUser = REQUIRED_ENV.POSTGRES_USER
    const dbPassword = REQUIRED_ENV.POSTGRES_PASSWORD
    const isDev = OPTIONAL_ENV.NODE_ENV === 'dev'
    const dbHost = `pizzubot-${isDev ? 'dev' : 'prod'}-postgres-c`

    const cmd = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -U ${dbUser} ${dbName} > "${filePath}"`

    console.log('Running backup command...')
    exec(cmd, async (err, stdout, stderr) => {
        if (err) {
            console.error('Backup failed:', err.message)
            console.error('Stderr:', stderr)
            console.error('Stdout:', stdout)
            return
        }

        try {
            console.log('Upload to drive start')
            // Check if file was created and has content
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath)
                console.log(`Backup file created: ${filePath}, size: ${stats.size} bytes`)

                if (stats.size === 0) {
                    console.error('Backup file is empty!')
                    return
                }

                const fileId = await uploadToDrive(filePath, fileName)
                console.log('Backup uploaded to Drive:', fileId)
                await cleanupOldBackups()
            } else {
                console.error('Backup file was not created')
                return
            }
        } catch (uploadErr) {
            console.error('Upload failed:', uploadErr)
        } finally {
            if (fs.existsSync(backupDir)) {
                fs.rmSync(backupDir, { recursive: true, force: true })
            }
        }
    })
}
