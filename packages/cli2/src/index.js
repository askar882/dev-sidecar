#!/usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { format } from 'node:util'
import {
  checkMitmproxyPath,
  getPluginNames,
  getRuntimeStatus,
  resolveMitmproxyPath,
  restartPlugins,
  startPlugins,
  startProxyRuntime,
  stopPlugins,
  stopProxyRuntime,
} from './runtime.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
)

program
  .name('ds2')
  .description('dev-sidecar Agent-Native CLI')
  .version(pkg.version)

process.env.DEV_SIDECAR_LOG_TARGET = 'cli2'

function writeJson (payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

function stdoutPrint (...args) {
  process.stdout.write(`${format(...args)}\n`)
}

function stderrPrint (...args) {
  process.stderr.write(`${format(...args)}\n`)
}

async function getRunningPort () {
  const DevSidecar = await import('@docmirror/dev-sidecar')
  try {
    const config
      = DevSidecar.default?.api?.config?.get?.()
      || DevSidecar.api?.config?.get?.()
    return config?.server?.port || 11223
  } catch {
    return 11223
  }
}

// === proxy commands ===
const proxyCmd = program.command('proxy').description('代理管理')

proxyCmd
  .command('start')
  .description('启动代理（默认复用已有内核）')
  .option('--mitmproxy <path>', 'mitmproxy 路径（默认使用 cli2 内置入口）')
  .option('--json', 'JSON 输出')
  .option('--force', '强制启动服务（端口占用时也尝试新启，通常不建议）')
  .action(async (opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const mitmproxyPath = resolveMitmproxyPath(opts.mitmproxy)

    if (!checkMitmproxyPath(mitmproxyPath)) {
      const result = {
        success: false,
        action: 'proxy_start',
        error: `mitmproxy 入口不存在: ${mitmproxyPath}`,
      }
      if (opts.json)
        writeJson(result)
      else stderrPrint(chalk.red('✗'), result.error)
      process.exit(1)
    }

    const port = await getRunningPort()

    try {
      const started = await startProxyRuntime(api, mitmproxyPath, {
        reuseExistingServer: !opts.force,
      })
      const result = {
        success: true,
        action: 'proxy_start',
        message: started.reusedServer
          ? '检测到已有内核，已复用并开启系统代理'
          : '代理服务与系统代理已启动',
        reusedServer: started.reusedServer,
        plugins: started.pluginResults,
        port,
        mitmproxyPath,
        status: started.runtime,
      }
      if (opts.json) {
        writeJson(result)
      } else {
        if (started.reusedServer) {
          stdoutPrint(chalk.green('✓'), `已复用现有内核，并开启系统代理（端口 ${port}）`)
        } else {
          stdoutPrint(chalk.green('✓'), `代理服务与系统代理已启动（端口 ${port}）`)
        }
      }
    } catch (err) {
      const result = {
        success: false,
        action: 'proxy_start',
        error: err.message,
      }
      if (opts.json)
        writeJson(result)
      else stderrPrint(chalk.red('✗'), '启动失败:', err.message)
      process.exit(1)
    }
  })

proxyCmd
  .command('stop')
  .description('关闭系统代理（可选停服务）')
  .option('--server', '同时停止代理服务进程（可能影响 GUI）')
  .option('--json', 'JSON 输出')
  .action(async (opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    try {
      const stopped = await stopProxyRuntime(api, {
        stopServer: !!opts.server,
      })
      const result = {
        success: stopped.success,
        action: 'proxy_stop',
        message: stopped.success
          ? (opts.server ? '系统代理与服务均已停止' : '系统代理已关闭（服务保持运行）')
          : '代理停止存在残留，请检查 errors',
        stopServer: !!opts.server,
        plugins: stopped.pluginResults,
        errors: stopped.errors,
        status: stopped.runtime,
      }
      if (opts.json) {
        writeJson(result)
      } else {
        if (stopped.success && opts.server) {
          stdoutPrint(chalk.green('✓'), '系统代理与服务均已停止')
        } else if (stopped.success) {
          stdoutPrint(chalk.green('✓'), '系统代理已关闭（服务保持运行）')
        } else {
          stderrPrint(chalk.yellow('⚠'), '代理停止存在残留：')
          stopped.errors.forEach(error => stderrPrint('  -', error))
        }
      }
      if (!stopped.success) {
        process.exit(1)
      }
    } catch (err) {
      const result = {
        success: false,
        action: 'proxy_stop',
        error: err.message,
      }
      if (opts.json)
        writeJson(result)
      else stderrPrint(chalk.red('✗'), '停止失败:', err.message)
      process.exit(1)
    }
  })

proxyCmd
  .command('status')
  .description('查看代理状态')
  .option('--json', 'JSON 输出')
  .action(async (opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const status = await getRuntimeStatus(api)
    if (opts.json) {
      writeJson({ success: true, status })
    } else {
      stdoutPrint(chalk.cyan('代理状态:'))
      stdoutPrint('  服务端口:', status.server.port)
      stdoutPrint(
        '  服务运行:',
        status.server.running ? chalk.green('是') : chalk.gray('否'),
      )
      stdoutPrint(
        '  系统代理:',
        status.proxy.running ? chalk.green('已开启') : chalk.gray('未开启'),
      )
      if (status.proxy.target) {
        stdoutPrint('  代理目标:', status.proxy.target)
      }
      stdoutPrint(
        '  由 dev-sidecar 管理:',
        status.proxy.managedByDevSidecar
          ? chalk.green('是')
          : chalk.yellow('否'),
      )
    }
  })

// === config commands ===
const configCmd = program.command('config').description('配置管理')

configCmd
  .command('get')
  .description('获取配置')
  .argument('[key]', '配置键')
  .option('--json', 'JSON 输出')
  .action(async (key, opts) => {
    const { default: lodash } = await import('lodash')
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const config = api.config.get()
    const value = key ? lodash.get(config, key) : config
    if (opts.json) {
      writeJson({ success: true, key, value })
    } else {
      if (key)
        stdoutPrint(chalk.cyan(`${key}:`), JSON.stringify(value, null, 2))
      else stdoutPrint(JSON.stringify(value, null, 2))
    }
  })

configCmd
  .command('set')
  .description('设置配置')
  .argument('<key>', '配置键')
  .argument('<value>', '配置值 (JSON)')
  .option('--json', 'JSON 输出')
  .action(async (key, value, opts) => {
    const { default: lodash } = await import('lodash')
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    try {
      let parsed
      try {
        parsed = JSON.parse(value)
      } catch {
        parsed = value
      }
      const config = api.config.get()
      lodash.set(config, key, parsed)
      const result = { success: true, key, value: parsed }
      if (opts.json)
        writeJson(result)
      else stdoutPrint(chalk.green('✓'), `${key} = ${JSON.stringify(parsed)}`)
    } catch (err) {
      if (opts.json)
        writeJson({ success: false, error: err.message })
      else stderrPrint(chalk.red('✗'), err.message)
      process.exit(1)
    }
  })

// === plugin commands ===
const pluginCmd = program.command('plugin').description('插件管理')

pluginCmd
  .command('start')
  .description('启动插件')
  .argument('[name]', '插件名，不传则启动所有已启用插件')
  .option('--json', 'JSON 输出')
  .action(async (name, opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const names = name ? [name] : undefined
    const results = await startPlugins(api, names)
    const success = results.every(item => item.success)
    const status = await getRuntimeStatus(api)
    const result = { success, action: 'plugin_start', plugins: results, status }
    if (opts.json) {
      writeJson(result)
    } else {
      results.forEach((item) => {
        if (item.success) {
          stdoutPrint(chalk.green('✓'), `插件已启动: ${item.name}`)
        } else {
          stderrPrint(chalk.red('✗'), `插件启动失败: ${item.name} - ${item.error}`)
        }
      })
    }
    if (!success) {
      process.exit(1)
    }
  })

pluginCmd
  .command('stop')
  .description('停止插件')
  .argument('[name]', '插件名，不传则停止所有运行中或已启用插件')
  .option('--json', 'JSON 输出')
  .action(async (name, opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const names = name ? [name] : undefined
    const results = await stopPlugins(api, names)
    const success = results.every(item => item.success)
    const status = await getRuntimeStatus(api)
    const result = { success, action: 'plugin_stop', plugins: results, status }
    if (opts.json) {
      writeJson(result)
    } else {
      results.forEach((item) => {
        if (item.success) {
          stdoutPrint(chalk.green('✓'), `插件已停止: ${item.name}`)
        } else {
          stderrPrint(chalk.red('✗'), `插件停止失败: ${item.name} - ${item.error}`)
        }
      })
    }
    if (!success) {
      process.exit(1)
    }
  })

pluginCmd
  .command('restart')
  .description('重启插件')
  .argument('[name]', '插件名，不传则重启所有已启用插件')
  .option('--json', 'JSON 输出')
  .action(async (name, opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const names = name ? [name] : undefined
    const results = await restartPlugins(api, names)
    const success = results.every(item => item.success)
    const status = await getRuntimeStatus(api)
    const result = { success, action: 'plugin_restart', plugins: results, status }
    if (opts.json) {
      writeJson(result)
    } else {
      results.forEach((item) => {
        if (item.success) {
          stdoutPrint(chalk.green('✓'), `插件已重启: ${item.name}`)
        } else {
          stderrPrint(chalk.red('✗'), `插件重启失败: ${item.name} - ${item.error}`)
        }
      })
    }
    if (!success) {
      process.exit(1)
    }
  })

pluginCmd
  .command('status')
  .description('查看插件状态')
  .option('--json', 'JSON 输出')
  .action(async (opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const status = await getRuntimeStatus(api)
    const result = { success: true, plugins: status.plugins }
    if (opts.json) {
      writeJson(result)
    } else {
      stdoutPrint(chalk.cyan('插件列表:'))
      status.plugins.forEach((plugin) => {
        const runningLabel = plugin.running ? chalk.green('运行中') : chalk.gray('未运行')
        const configuredLabel = plugin.enabled ? chalk.green('已启用') : chalk.gray('未启用')
        stdoutPrint(`  ${plugin.name}: ${runningLabel} / ${configuredLabel}`)
      })
    }
  })

pluginCmd
  .option('--json', 'JSON 输出')
  .action(async (opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const status = await getRuntimeStatus(api)
    const plugins = status.plugins.length > 0
      ? status.plugins
      : getPluginNames(api).map(name => ({ name, enabled: false, running: false }))
    if (opts.json) {
      writeJson({ success: true, plugins })
    } else {
      stdoutPrint(chalk.cyan('插件列表:'))
      plugins.forEach((plugin) => {
        const runningDot = plugin.running ? chalk.green('●') : chalk.gray('○')
        const configuredText = plugin.enabled ? chalk.green('已启用') : chalk.gray('未启用')
        stdoutPrint(`  ${runningDot} ${plugin.name} (${configuredText})`)
      })
    }
  })

// === status ===
program
  .command('status')
  .description('查看完整状态')
  .option('--json', 'JSON 输出')
  .action(async (opts) => {
    const DevSidecar = await import('@docmirror/dev-sidecar')
    const api = DevSidecar.default?.api || DevSidecar.api
    const status = await getRuntimeStatus(api)
    const config = api.config.get()
    const result = {
      success: true,
      status,
      server: {
        enabled: config.server?.enabled,
        running: status.server.running,
        port: status.server.port,
      },
      proxy: {
        enabled: config.proxy?.enabled,
        running: status.proxy.running,
        managedByDevSidecar: status.proxy.managedByDevSidecar,
        target: status.proxy.target,
      },
      plugins: status.plugins,
    }
    if (opts.json) {
      writeJson(result)
    } else {
      stdoutPrint(chalk.cyan('dev-sidecar 状态:'))
      stdoutPrint(
        '  服务器配置:',
        config.server?.enabled ? chalk.green('启用') : chalk.gray('禁用'),
      )
      stdoutPrint(
        '  服务器运行:',
        status.server.running ? chalk.green('运行中') : chalk.gray('已停止'),
      )
      stdoutPrint(
        '  系统代理配置:',
        config.proxy?.enabled ? chalk.green('启用') : chalk.gray('禁用'),
      )
      stdoutPrint(
        '  系统代理运行:',
        status.proxy.running ? chalk.green('已开启') : chalk.gray('未开启'),
      )
      if (status.proxy.target) {
        stdoutPrint('  代理目标:', status.proxy.target)
      }
      result.plugins.forEach((p) => {
        stdoutPrint(
          `  插件 ${p.name}:`,
          p.running ? chalk.green('运行中') : chalk.gray('未运行'),
          '/',
          p.enabled ? chalk.green('已启用') : chalk.gray('未启用'),
        )
      })
    }
  })

// === TUI ===
program
  .command('tui')
  .description('打开终端交互界面 (TUI Dashboard)')
  .action(async () => {
    const { startTUI } = await import('./tui/app.js')
    startTUI()
  })

program.parse()
