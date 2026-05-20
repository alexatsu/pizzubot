import 'dotenv/config'

import { handleBackup } from '@/backup'
import { initMonitoring } from '@/external/monitoring'
import { initFeatures } from '@/features'
import { initBackup, initCommands, initServer, initValidateEnv } from '@/init'

initValidateEnv()
initFeatures()
await initServer()
await initCommands()
initMonitoring()
initBackup()
await handleBackup()
