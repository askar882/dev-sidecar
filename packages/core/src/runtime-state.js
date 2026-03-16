const fs = require('node:fs')
const path = require('node:path')
const lodash = require('lodash')
const configLoader = require('./config/local-config-loader')

function getUserBasePath () {
  return configLoader.getUserBasePath()
}

function getRuntimeStatePath () {
  return path.join(getUserBasePath(), '/runtime-status.json')
}

function getServerPidPath () {
  return path.join(getUserBasePath(), '/server.pid')
}

function getDefaultRuntimeState () {
  return {
    server: {
      enabled: false,
      pid: null,
    },
    proxy: {
      enabled: false,
      proxyTarget: '',
    },
    plugin: {},
  }
}

function ensureDir () {
  const dir = getUserBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

function loadRuntimeState () {
  ensureDir()
  const filePath = getRuntimeStatePath()
  if (!fs.existsSync(filePath)) {
    return getDefaultRuntimeState()
  }

  try {
    const file = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(file)
    return lodash.merge(getDefaultRuntimeState(), parsed)
  } catch {
    return getDefaultRuntimeState()
  }
}

function saveRuntimeState (state) {
  ensureDir()
  fs.writeFileSync(getRuntimeStatePath(), JSON.stringify(state, null, 2))
}

function saveStatus (status) {
  const merged = lodash.merge(getDefaultRuntimeState(), status)
  const pid = getServerPid()
  if (pid != null) {
    lodash.set(merged, 'server.pid', pid)
  }
  saveRuntimeState(merged)
}

function setServerPid (pid) {
  ensureDir()
  fs.writeFileSync(getServerPidPath(), String(pid))

  const state = loadRuntimeState()
  lodash.set(state, 'server.pid', pid)
  saveRuntimeState(state)
}

function getServerPid () {
  const filePath = getServerPidPath()
  if (!fs.existsSync(filePath)) {
    return null
  }
  const raw = fs.readFileSync(filePath, 'utf8').trim()
  const pid = Number(raw)
  if (!Number.isFinite(pid)) {
    return null
  }
  return pid
}

function clearServerPid () {
  const filePath = getServerPidPath()
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  const state = loadRuntimeState()
  lodash.set(state, 'server.pid', null)
  lodash.set(state, 'server.enabled', false)
  saveRuntimeState(state)
}

module.exports = {
  getRuntimeStatePath,
  getServerPidPath,
  getDefaultRuntimeState,
  loadRuntimeState,
  saveRuntimeState,
  saveStatus,
  setServerPid,
  getServerPid,
  clearServerPid,
}
