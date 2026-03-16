import React, { useState, useEffect } from 'react'
import { render, Box, Text, useApp, useInput } from 'ink'
import { getRuntimeStatus } from '../runtime.js'

const theme = { colors: { primary: 'cyan', accent: 'green', warn: 'yellow', error: 'red', muted: 'gray' } }

// ===== Sidebar =====
function Sidebar({ items, activeIndex, isFocused }) {
  return React.createElement(Box, { flexDirection: 'column', width: 16 },
    React.createElement(Text, { bold: true, color: theme.colors.primary }, '◀ DevSidecar ▶'),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      ...items.map((item, i) => {
        const isSelected = i === activeIndex
        const color = isSelected ? theme.colors.accent : 'white'
        return React.createElement(Text, { key: i, color: !isFocused && isSelected ? theme.colors.muted : color, bold: isSelected },
          (isSelected ? '▸ ' : '  ') + item.label
        )
      })
    )
  )
}

// ===== Pages =====
function StatusPage({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    getRuntimeStatus(api)
      .then((runtime) => setData(runtime))
      .catch((e) => setData({ error: e.message }))
  }, [])
  if (!data) return React.createElement(Text, {}, '加载中...')
  if (data.error) return React.createElement(Text, { color: theme.colors.error }, '错误: ' + data.error)
  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { bold: true, color: theme.colors.primary }, '═══ 服务状态 ═══'),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, {}, '  服务端口: ', React.createElement(Text, { color: theme.colors.accent }, String(data.server?.port))),
      React.createElement(Text, {}, '  服务器: ', React.createElement(Text, { color: data.server?.running ? theme.colors.accent : theme.colors.muted }, data.server?.running ? '● 运行中' : '○ 已停止')),
      React.createElement(Text, {}, '  系统代理: ', React.createElement(Text, { color: data.proxy?.running ? theme.colors.accent : theme.colors.muted }, data.proxy?.running ? '● 已开启' : '○ 已关闭')),
      React.createElement(Text, {}, '  DS 管理: ', React.createElement(Text, { color: data.proxy?.managedByDevSidecar ? theme.colors.accent : theme.colors.warn }, data.proxy?.managedByDevSidecar ? '● 是' : '○ 否'))
    ),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: theme.colors.primary }, '═══ 插件 ═══'),
      ...Object.entries(api.config.get().plugin || {}).map(([name, cfg]) =>
        React.createElement(Text, { key: name }, '  ', React.createElement(Text, { color: cfg?.enabled ? theme.colors.accent : theme.colors.muted }, cfg?.enabled ? '●' : '○'), ' ' + name)
      )
    )
  )
}

function ConfigPage({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { try { setData(api.config.get()) } catch (e) { setData({ error: e.message }) } }, [])
  if (!data) return React.createElement(Text, {}, '加载中...')
  const items = [['server.enabled', data.server?.enabled], ['server.host', data.server?.host], ['server.port', data.server?.port], ['proxy.enabled', data.proxy?.enabled], ['dns.overall.enabled', data.dns?.overall?.enabled]]
  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { bold: true, color: theme.colors.primary }, '═══ 关键配置 ═══'),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      ...items.map(([k, v]) => React.createElement(Text, { key: k }, '  ', React.createElement(Text, { color: theme.colors.muted }, k + ': '), React.createElement(Text, { color: theme.colors.accent }, JSON.stringify(v))))
    )
  )
}

function PluginsPage({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { try { setData(api.config.get().plugin || {}) } catch (e) { setData({ error: e.message }) } }, [])
  if (!data) return React.createElement(Text, {}, '加载中...')
  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { bold: true, color: theme.colors.primary }, '═══ 插件管理 ═══'),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      ...Object.entries(data).map(([name, cfg]) =>
        React.createElement(Text, { key: name }, '  ', React.createElement(Text, { color: cfg?.enabled ? theme.colors.accent : theme.colors.muted, bold: true }, cfg?.enabled ? '● ' : '○ '), React.createElement(Text, { bold: true }, name))
      )
    )
  )
}

function HelpPage() {
  const cmds = [['ds2 status', '查看状态'], ['ds2 proxy start|stop', '代理管理'], ['ds2 config get|set', '配置管理'], ['ds2 plugin list', '插件列表'], ['ds2 tui', '此界面'], ['所有命令 --json', 'Agent 模式']]
  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { bold: true, color: theme.colors.primary }, '═══ 命令速查 ═══'),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      ...cmds.map(([c, d]) => React.createElement(Text, { key: c }, '  ', React.createElement(Text, { color: theme.colors.accent }, c), React.createElement(Text, { color: theme.colors.muted }, ' — ' + d)))
    )
  )
}

const menus = [
  { label: '主页', page: StatusPage }, { label: '配置', page: ConfigPage },
  { label: '插件', page: PluginsPage }, { label: '帮助', page: HelpPage },
]

function App({ api }) {
  const { exit } = useApp()
  const [activeIndex, setActiveIndex] = useState(0)
  const [focusArea, setFocusArea] = useState('sidebar')
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) { exit(); return }
    if (key.tab) { setFocusArea(p => p === 'sidebar' ? 'content' : 'sidebar'); return }
    if (focusArea === 'sidebar') {
      if (key.upArrow) setActiveIndex(i => (i - 1 + menus.length) % menus.length)
      else if (key.downArrow) setActiveIndex(i => (i + 1) % menus.length)
    }
  })
  const CurrentPage = menus[activeIndex].page
  return React.createElement(Box, { flexDirection: 'column', padding: 1 },
    React.createElement(Box, { flexDirection: 'row' },
      React.createElement(Sidebar, { items: menus, activeIndex, isFocused: focusArea === 'sidebar' }),
      React.createElement(Box, { marginLeft: 2, flexGrow: 1, flexDirection: 'column' },
        React.createElement(CurrentPage, { api })
      )
    ),
    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { color: theme.colors.muted }, ' [Tab]切换 [↑↓]选择 [q]退出')
    )
  )
}

export function startTUI() {
  let DevSidecar
  try { DevSidecar = require('@docmirror/dev-sidecar') } catch {
    import('@docmirror/dev-sidecar').then(m => {
      const api = m.default?.api || m.api
      render(React.createElement(App, { api }))
    }).catch(e => { console.error('无法加载 dev-sidecar:', e.message); process.exit(1) })
    return
  }
  const api = DevSidecar.default?.api || DevSidecar.api
  render(React.createElement(App, { api }))
}
