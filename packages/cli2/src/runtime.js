import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

function getCoreRuntimeApi (api) {
  const runtime = api?.runtime
  if (!runtime) {
    throw new Error('当前 core 不支持 runtime API，请升级 @docmirror/dev-sidecar')
  }
  return runtime
}

export function resolveMitmproxyPath (inputPath) {
  if (inputPath) {
    return resolve(process.cwd(), inputPath)
  }
  return fileURLToPath(new URL('./mitmproxy.cjs', import.meta.url))
}

export function checkMitmproxyPath (filePath) {
  return existsSync(filePath)
}

export async function isPortInUse (api, port) {
  return getCoreRuntimeApi(api).isPortInUse(port)
}

export async function waitForPort (api, port, timeoutMs = 5000, intervalMs = 150) {
  return getCoreRuntimeApi(api).waitForPort(port, timeoutMs, intervalMs)
}

export async function getRuntimeStatus (api) {
  return getCoreRuntimeApi(api).getRuntimeStatus(api)
}

export function getPluginNames (api) {
  return getCoreRuntimeApi(api).getPluginNames(api)
}

export async function startPlugins (api, names) {
  return getCoreRuntimeApi(api).startPlugins(api, names)
}

export async function stopPlugins (api, names) {
  return getCoreRuntimeApi(api).stopPlugins(api, names)
}

export async function restartPlugins (api, names) {
  return getCoreRuntimeApi(api).restartPlugins(api, names)
}

export async function startProxyRuntime (api, mitmproxyPath, options) {
  return getCoreRuntimeApi(api).startProxyRuntime(api, mitmproxyPath, options)
}

export async function stopProxyRuntime (api, options) {
  return getCoreRuntimeApi(api).stopProxyRuntime(api, options)
}
