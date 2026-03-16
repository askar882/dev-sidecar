const fs = require('node:fs')
const path = require('node:path')
const server = require('@docmirror/mitmproxy')
const jsonApi = require('@docmirror/mitmproxy/src/json')
const log = require('@docmirror/mitmproxy/src/utils/util.log.server')

const home = process.env.USER_HOME || process.env.HOME || process.env.USERPROFILE || 'C:/Users/Administrator/'

let configPath
if (process.argv && process.argv.length > 2 && process.argv[2]) {
  configPath = process.argv[2]
} else {
  configPath = path.join(home, '.dev-sidecar/running.json')
}

const configJson = fs.readFileSync(configPath)
log.info('读取 running.json by cli2 成功:', configPath)

let config
try {
  config = jsonApi.parse(configJson.toString())
} catch (e) {
  log.error(`running.json 文件内容格式不正确，文件路径：${configPath}，文件内容: ${configJson.toString()}, error:`, e)
  config = {}
}

config.setting.rootDir = path.join(__dirname, '../../gui/')
log.info(`start mitmproxy by cli2, configPath: ${configPath}`)
server.start(config)
