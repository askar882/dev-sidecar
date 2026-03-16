const lodash = require('lodash')
const event = require('./event')
const log = require('./utils/util.log.core')
const runtimeState = require('./runtime-state')

const status = lodash.merge({
  server: { enabled: false },
  proxy: {},
  plugin: {},
}, runtimeState.loadRuntimeState())

event.register('status', (event) => {
  lodash.set(status, event.key, event.value)
  runtimeState.saveStatus(status)
  log.info('status changed:', event)
}, -999)

module.exports = status
