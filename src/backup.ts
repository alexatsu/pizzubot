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
    const drive = getDriveClient()

    const res = await drive.files.create({
        requestBody: { name: fileName, parents: [DRIVE_FOLDER_ID] },
        media: { mimeType: 'application/sql', body: fs.createReadStream(filePath) },
        fields: 'id',
    })

    return res.data.id
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

    const backupDir = path.resolve('backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
    const filePath = path.join(backupDir, fileName)

    const dbName = REQUIRED_ENV.POSTGRES_DB
    const dbUser = REQUIRED_ENV.POSTGRES_USER
    const dbPassword = REQUIRED_ENV.POSTGRES_PASSWORD
    const isDev = REQUIRED_ENV.NODE_ENV === 'dev'
    const dockerContainerName = `pizzubot-${isDev ? 'dev' : 'prod'}-postgres-c`

    const cmd = `docker exec -e PGPASSWORD=${dbPassword} ${dockerContainerName} pg_dump -U ${dbUser} ${dbName} > "${filePath}"`

    exec(cmd, async (err, stdout, stderr) => {
        if (err) {
            console.error('Backup failed:', err.message)
            console.error(stderr)
            return
        }

        try {
            const fileId = await uploadToDrive(filePath, fileName)
            console.log('Backup uploaded to Drive:', fileId)
            await cleanupOldBackups()
            fs.rmSync(backupDir, { recursive: true, force: true })
        } catch (uploadErr) {
            console.error('Upload failed:', uploadErr)
        }
    })
}
