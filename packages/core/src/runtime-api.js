const net = require('node:net')
const runtimeState = require('./runtime-state')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isPidRunning (pid) {
  const numericPid = Number(pid)
  if (!Number.isFinite(numericPid) || numericPid <= 0) {
    return false
  }
  try {
    process.kill(numericPid, 0)
    return true
  } catch {
    return false
  }
}

function terminatePid (pid, signal = 'SIGTERM') {
  const numericPid = Number(pid)
  if (!Number.isFinite(numericPid) || numericPid <= 0) {
    return false
  }
  try {
    process.kill(numericPid, signal)
    return true
  } catch {
    return false
  }
}

async function isPortInUse (port) {
  return new Promise((resolveResult) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolveResult(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolveResult(false)
    })
    socket.once('error', () => resolveResult(false))
  })
}

async function waitForPort (port, timeoutMs = 5000, intervalMs = 150) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isPortInUse(port)) {
      return true
    }
    await sleep(intervalMs)
  }
  return false
}

function parseProxyServer (proxyServerRaw = '') {
  const proxyServer = String(proxyServerRaw || '').trim()
  const targets = []
  if (!proxyServer) {
    return targets
  }
  const sections = proxyServer.split(';').map(item => item.trim()).filter(Boolean)
  for (const section of sections) {
    const normalized = section.includes('=') ? section.split('=')[1] : section
    const withoutSchema = normalized.replace(/^https?:\/\//i, '')
    const [host, portRaw] = withoutSchema.split(':')
    const port = Number(portRaw)
    if (host && Number.isFinite(port)) {
      targets.push({ host: host.toLowerCase(), port })
    }
  }
  return targets
}

function getExpectedPorts (config, port) {
  return config.proxy && config.proxy.proxyHttp ? [port, port - 1] : [port]
}

function matchDevSidecarTarget (targets, expectedPorts, enabled) {
  return enabled && targets.some((item) => {
    return (item.host === '127.0.0.1' || item.host === 'localhost') && expectedPorts.includes(item.port)
  })
}

async function getWindowsSystemProxy (api, expectedPorts) {
  try {
    const output = await api.shell.exec('$p=Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"; $obj=@{proxyEnable=[int]$p.ProxyEnable;proxyServer=$p.ProxyServer}; $obj|ConvertTo-Json -Compress')
    const info = JSON.parse(String(output || '').trim())
    const enabled = Number(info.proxyEnable) === 1
    const targets = parseProxyServer(info.proxyServer)
    const matchesDevSidecar = matchDevSidecarTarget(targets, expectedPorts, enabled)
    return {
      enabled,
      proxyServer: info.proxyServer || '',
      targets,
      matchesDevSidecar,
      source: 'windows-registry',
    }
  } catch {
    return {
      enabled: false,
      proxyServer: '',
      targets: [],
      matchesDevSidecar: false,
      source: 'windows-registry-failed',
    }
  }
}

function getLinuxProxyFromEnv (expectedPorts) {
  const http = process.env.http_proxy || process.env.HTTP_PROXY || ''
  const https = process.env.https_proxy || process.env.HTTPS_PROXY || ''
  const joined = [http, https].filter(Boolean).join(';')
  const targets = parseProxyServer(joined)
  const enabled = targets.length > 0
  return {
    enabled,
    proxyServer: joined,
    targets,
    matchesDevSidecar: matchDevSidecarTarget(targets, expectedPorts, enabled),
    source: 'linux-env',
  }
}

async function getLinuxSystemProxy (api, expectedPorts) {
  try {
    const [modeOutput, httpsHostOutput, httpsPortOutput, httpHostOutput, httpPortOutput] = await Promise.all([
      api.shell.exec('gsettings get org.gnome.system.proxy mode'),
      api.shell.exec('gsettings get org.gnome.system.proxy.https host'),
      api.shell.exec('gsettings get org.gnome.system.proxy.https port'),
      api.shell.exec('gsettings get org.gnome.system.proxy.http host'),
      api.shell.exec('gsettings get org.gnome.system.proxy.http port'),
    ])

    const mode = String(modeOutput || '').replaceAll('\'', '').trim()
    const enabled = mode === 'manual'
    const httpsHost = String(httpsHostOutput || '').replaceAll('\'', '').trim()
    const httpsPort = Number(String(httpsPortOutput || '').trim())
    const httpHost = String(httpHostOutput || '').replaceAll('\'', '').trim()
    const httpPort = Number(String(httpPortOutput || '').trim())
    const targets = [
      { host: httpHost, port: httpPort },
      { host: httpsHost, port: httpsPort },
    ].filter(item => item.host && Number.isFinite(item.port) && item.port > 0)

    const matchesDevSidecar = matchDevSidecarTarget(targets, expectedPorts, enabled)
    const proxyServer = targets.map((item, index) => {
      const key = index === 0 ? 'http' : 'https'
      return `${key}=http://${item.host}:${item.port}`
    }).join(';')

    return {
      enabled,
      proxyServer,
      targets,
      matchesDevSidecar,
      source: 'linux-gsettings',
    }
  } catch {
    return getLinuxProxyFromEnv(expectedPorts)
  }
}

async function getMacSystemProxy (api, expectedPorts) {
  try {
    let adapter = await api.shell.exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 "')
    adapter = String(adapter || '').trim()
    adapter = adapter.substring(adapter.indexOf(' ')).trim()

    const [secureWebProxy, webProxy] = await Promise.all([
      api.shell.exec(`networksetup -getsecurewebproxy "${adapter}"`),
      api.shell.exec(`networksetup -getwebproxy "${adapter}"`),
    ])

    function parseNetworkSetupProxy (output) {
      const text = String(output || '')
      const enabled = /Enabled:\s*Yes/i.test(text)
      const serverMatch = text.match(/Server:\s*(.+)/i)
      const portMatch = text.match(/Port:\s*(\d+)/i)
      return {
        enabled,
        host: serverMatch && serverMatch[1] ? serverMatch[1].trim() : '',
        port: Number(portMatch && portMatch[1] ? portMatch[1] : 0),
      }
    }

    const httpsProxy = parseNetworkSetupProxy(secureWebProxy)
    const httpProxy = parseNetworkSetupProxy(webProxy)
    const enabled = httpsProxy.enabled || httpProxy.enabled
    const targets = [httpProxy, httpsProxy]
      .filter(item => item.host && Number.isFinite(item.port) && item.port > 0)
      .map(item => ({ host: item.host, port: item.port }))
    const matchesDevSidecar = matchDevSidecarTarget(targets, expectedPorts, enabled)

    const proxyServer = []
    if (httpProxy.host && Number.isFinite(httpProxy.port) && httpProxy.port > 0) {
      proxyServer.push(`http=http://${httpProxy.host}:${httpProxy.port}`)
    }
    if (httpsProxy.host && Number.isFinite(httpsProxy.port) && httpsProxy.port > 0) {
      proxyServer.push(`https=http://${httpsProxy.host}:${httpsProxy.port}`)
    }

    return {
      enabled,
      proxyServer: proxyServer.join(';'),
      targets,
      matchesDevSidecar,
      source: 'mac-networksetup',
    }
  } catch {
    return {
      enabled: false,
      proxyServer: '',
      targets: [],
      matchesDevSidecar: false,
      source: 'mac-networksetup-failed',
    }
  }
}

async function getSystemProxyRuntime (api, config, port) {
  const platform = api.shell.getSystemPlatform(false)
  const expectedPorts = getExpectedPorts(config, port)

  if (platform === 'windows') {
    return getWindowsSystemProxy(api, expectedPorts)
  }
  if (platform === 'linux') {
    return getLinuxSystemProxy(api, expectedPorts)
  }
  if (platform === 'mac') {
    return getMacSystemProxy(api, expectedPorts)
  }

  const configured = !!(config.proxy && config.proxy.enabled)
  return {
    enabled: configured,
    proxyServer: '',
    targets: [],
    matchesDevSidecar: configured,
    source: 'config-fallback',
  }
}

function getPluginRuntimeList (config, runtime) {
  const pluginConfig = config.plugin || {}
  const runtimePlugin = runtime.plugin || {}
  return Object.keys(pluginConfig).map(name => ({
    name,
    enabled: !!(pluginConfig[name] && pluginConfig[name].enabled),
    running: !!(runtimePlugin[name] && runtimePlugin[name].enabled),
  }))
}

async function getRuntimeStatus (api) {
  const config = api.config.get()
  const port = config.server && config.server.port ? config.server.port : 11223
  const runtime = runtimeState.loadRuntimeState()
  const pid = runtime.server && runtime.server.pid ? runtime.server.pid : runtimeState.getServerPid()
  const pidRunning = isPidRunning(pid)
  const serverPortAlive = await isPortInUse(port)
  const serverRunning = !!(runtime.server && runtime.server.enabled) && pidRunning && serverPortAlive
  const systemProxy = await getSystemProxyRuntime(api, config, port)

  return {
    status: runtime,
    server: {
      configured: !!(config.server && config.server.enabled),
      running: serverRunning,
      port,
      pid: pid || null,
      managedByDevSidecar: serverRunning,
    },
    proxy: {
      configured: !!(config.proxy && config.proxy.enabled),
      running: systemProxy.enabled,
      target: systemProxy.proxyServer,
      managedByDevSidecar: systemProxy.matchesDevSidecar && serverRunning,
      source: systemProxy.source,
    },
    plugins: getPluginRuntimeList(config, runtime),
  }
}

async function runPluginAction (api, action, names) {
  const results = []
  for (const name of names) {
    const pluginApi = api.plugin && api.plugin[name]
    if (!pluginApi || typeof pluginApi[action] !== 'function') {
      results.push({ name, success: false, error: `插件不支持操作: ${action}` })
      continue
    }
    try {
      await pluginApi[action]()
      results.push({ name, success: true })
    } catch (error) {
      results.push({ name, success: false, error: error.message })
    }
  }
  return results
}

function getConfiguredPluginNames (api) {
  const config = api.config.get()
  const pluginConfig = config.plugin || {}
  return Object.keys(pluginConfig).filter(name => pluginConfig[name] && pluginConfig[name].enabled)
}

function getPluginNames (api) {
  return Object.keys(api.config.get().plugin || {})
}

async function startPlugins (api, names) {
  const targetNames = names && names.length ? names : getConfiguredPluginNames(api)
  return runPluginAction(api, 'start', targetNames)
}

async function stopPlugins (api, names) {
  const runtime = await getRuntimeStatus(api)
  const targetNames = names && names.length
    ? names
    : runtime.plugins.filter(plugin => plugin.running || plugin.enabled).map(plugin => plugin.name)
  return runPluginAction(api, 'close', targetNames)
}

async function restartPlugins (api, names) {
  const targetNames = names && names.length ? names : getConfiguredPluginNames(api)
  return runPluginAction(api, 'restart', targetNames)
}

async function startProxyRuntime (api, mitmproxyPath, options = {}) {
  const reuseExistingServer = options.reuseExistingServer !== false
  const runtimeBeforeStart = await getRuntimeStatus(api)
  const port = runtimeBeforeStart.server.port
  const serverAlreadyRunning = runtimeBeforeStart.server.running
  const foreignPortOccupied = !serverAlreadyRunning && await isPortInUse(port)

  if (foreignPortOccupied && !reuseExistingServer) {
    throw new Error(`端口 ${port} 已被其他进程占用，无法确认是 dev-sidecar 内核`)
  }

  let serverInfo = null
  let reusedServer = false

  if ((serverAlreadyRunning || foreignPortOccupied) && reuseExistingServer) {
    reusedServer = true
  } else {
    serverInfo = await api.server.start({ mitmproxyPath })
    const listening = await waitForPort(port, 5000)
    if (!listening) {
      throw new Error(`代理服务未成功监听端口 ${port}`)
    }
  }

  await api.proxy.start()
  const pluginResults = await startPlugins(api)
  const pluginFailures = pluginResults.filter(item => !item.success)
  if (pluginFailures.length > 0) {
    throw new Error(`插件启动失败: ${pluginFailures.map(item => `${item.name}: ${item.error}`).join('; ')}`)
  }

  const runtime = await getRuntimeStatus(api)
  if (!runtime.proxy.running) {
    throw new Error('系统代理未成功开启')
  }

  return {
    serverInfo,
    reusedServer,
    pluginResults,
    runtime,
  }
}

async function stopProxyRuntime (api, options = {}) {
  const stopServer = !!options.stopServer
  const runtimeBeforeStop = await getRuntimeStatus(api)
  const port = runtimeBeforeStop.server.port

  const errors = []
  const pluginResults = await stopPlugins(api)
  pluginResults.filter(item => !item.success).forEach((item) => {
    errors.push(`关闭插件 ${item.name} 失败: ${item.error}`)
  })

  try {
    await api.proxy.close()
  } catch (e) {
    errors.push(`关闭系统代理失败: ${e.message}`)
  }

  try {
    if (stopServer) {
      const pid = runtimeBeforeStop.server.pid || runtimeState.getServerPid()
      const hasLivePid = pid && isPidRunning(pid)
      const hasLivePort = await isPortInUse(port)

      if (hasLivePid) {
        terminatePid(pid, 'SIGTERM')
        await sleep(700)
        if (await isPortInUse(port)) {
          terminatePid(pid, 'SIGKILL')
          await sleep(700)
        }
      } else if (runtimeBeforeStop.server.running) {
        try {
          await api.server.close()
          await sleep(700)
        } catch (error) {
          errors.push(`关闭代理服务失败: ${error.message}`)
        }
      }

      if (hasLivePort && await isPortInUse(port)) {
        try {
          await api.shell.killByPort({ port })
          await sleep(700)
        } catch (error) {
          errors.push(`按端口清理服务失败: ${error.message}`)
        }
      }
    }
  } catch (e) {
    errors.push(`关闭代理服务失败: ${e.message}`)
  }

  const serverRunningAfterStop = await isPortInUse(port)
  if (stopServer && serverRunningAfterStop) {
    errors.push(`端口 ${port} 仍被占用`)
  }

  const runtime = await getRuntimeStatus(api)
  return {
    success: errors.length === 0,
    errors,
    pluginResults,
    runtime,
  }
}

module.exports = {
  isPortInUse,
  waitForPort,
  getRuntimeStatus,
  getPluginNames,
  startPlugins,
  stopPlugins,
  restartPlugins,
  startProxyRuntime,
  stopProxyRuntime,
}
