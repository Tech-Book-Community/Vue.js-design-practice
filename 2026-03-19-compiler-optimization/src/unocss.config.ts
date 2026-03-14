import config from '@slidev/client/uno.config'
import { mergeConfigs } from 'unocss'
import fontConfig from '../../fonts/config'

export default mergeConfigs([
  config,
  fontConfig,
])
