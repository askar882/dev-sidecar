/**
 * 设置环境变量
 */
const fs = require('node:fs')
const path = require('node:path')
const Shell = require('../shell')

const execute = Shell.execute

const BEGIN_MARKER = '# >>> dev-sidecar env >>>'
const END_MARKER = '# <<< dev-sidecar env <<<'

function buildEnvBlock (list) {
  const lines = list
    .filter(item => item && item.key)
    .map((item) => {
      if (item.value == null || item.value === '') {
        return `unset ${item.key}`
      }
      return `export ${item.key}="${String(item.value).replaceAll('"', '\\"')}"`
    })
  return `${BEGIN_MARKER}\n${lines.join('\n')}\n${END_MARKER}`
}

function updateShellProfile (filePath, list) {
  let content = ''
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8')
  }

  const blockPattern = new RegExp(`${BEGIN_MARKER}[\\s\\S]*?${END_MARKER}\\n?`, 'g')
  const cleaned = content.replace(blockPattern, '').trimEnd()
  const next = `${cleaned ? `${cleaned}\n\n` : ''}${buildEnvBlock(list)}\n`
  fs.writeFileSync(filePath, next)
}

function getProfilePaths () {
  const home = process.env.HOME || process.env.USERPROFILE || '/'
  return [
    path.join(home, '.profile'),
    path.join(home, '.bashrc'),
    path.join(home, '.zshrc'),
  ]
}

const executor = {
  async windows (exec, { list }) {
    const cmds = []
    for (const item of list) {
      // [Environment]::SetEnvironmentVariable('FOO', 'bar', 'Machine')
      const value = item.value == null || item.value === '' ? '$null' : `'${item.value}'`
      cmds.push(`[Environment]::SetEnvironmentVariable('${item.key}', ${value}, 'Machine')`)
    }
    const ret = await exec(cmds, { type: 'ps' })

    const cmds2 = []
    for (const item of list) {
      // [Environment]::SetEnvironmentVariable('FOO', 'bar', 'Machine')
      if (item.value == null || item.value === '') {
        cmds2.push(`set ${item.key}=`)
      } else {
        cmds2.push(`set ${item.key}=${item.value}`)
      }
    }
    await exec(cmds2, { type: 'cmd' })
    return ret
  },
  async linux (_exec, { list }) {
    const profiles = getProfilePaths()
    for (const profile of profiles) {
      updateShellProfile(profile, list)
    }
    return true
  },
  async mac (_exec, { list }) {
    const profiles = getProfilePaths()
    for (const profile of profiles) {
      updateShellProfile(profile, list)
    }
    return true
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
