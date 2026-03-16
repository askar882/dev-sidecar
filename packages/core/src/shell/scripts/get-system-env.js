/**
 * 获取环境变量
 */
const Shell = require('../shell')

const execute = Shell.execute

const executor = {
  async windows (exec) {
    const ret = await exec(['set'], { type: 'cmd' })
    const map = {}
    if (ret != null) {
      const lines = ret.split('\r\n')
      for (const item of lines) {
        const kv = item.split('=')
        if (kv.length > 1) {
          map[kv[0].trim()] = kv[1].trim()
        }
      }
    }
    return map
  },
  async linux (exec) {
    const ret = await exec(['printenv'])
    const map = {}
    if (ret != null) {
      const lines = ret.split('\n')
      for (const item of lines) {
        const index = item.indexOf('=')
        if (index > 0) {
          map[item.substring(0, index).trim()] = item.substring(index + 1).trim()
        }
      }
    }
    return map
  },
  async mac (exec) {
    const ret = await exec(['printenv'])
    const map = {}
    if (ret != null) {
      const lines = ret.split('\n')
      for (const item of lines) {
        const index = item.indexOf('=')
        if (index > 0) {
          map[item.substring(0, index).trim()] = item.substring(index + 1).trim()
        }
      }
    }
    return map
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
