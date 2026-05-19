import 'dotenv/config'

import { initMonitoring } from '@/external/monitoring'
import { initFeatures } from '@/features'
import { initBackup, initCommands, initServer, initValidateEnv } from '@/init'

initValidateEnv()
initFeatures()
await initServer()
await initCommands()
initMonitoring()
initBackup()
