import 'dotenv/config'

import { initMonitoring } from '@/external/monitoring'
import { initValidateEnv } from '@/shared/config/env'
import { initCommands, initServer } from '@/shared/init'
import { initFeatures } from '@/features'

initValidateEnv()
initFeatures()
await initServer()
await initCommands()
initMonitoring()
