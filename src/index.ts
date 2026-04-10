import 'dotenv/config'

import { initMonitoring } from '@/external/monitoring'
import { initFeatures } from '@/features'
import { initCommands, initServer, initValidateEnv } from '@/init'

initValidateEnv()
initFeatures()
await initServer()
await initCommands()
initMonitoring()
