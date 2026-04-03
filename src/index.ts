import 'dotenv/config'

import { initMonitoring } from '@/external/monitoring'
import { initFeatures } from '@/features'
import { initValidateEnv } from '@/shared/config/env'
import { initCommands, initServer } from '@/shared/init'

initValidateEnv()
initFeatures()
await initServer()
await initCommands()
initMonitoring()
