import React, { useState } from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import { theme } from '../style/theme.js'

export default function IndexPage({ isFocused = false }) {
  const [services, setServices] = useState([
    { id: 'server', name: 'DevSidecar Core', status: 'Stopped' },
    { id: 'proxy', name: 'System Proxy', status: 'Stopped' },
  ])
  const [message, setMessage] = useState('')

  const handleSelect = (item) => {
    const serviceId = item.value
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const newStatus = service.status === 'Running' ? 'Stopped' : 'Running'
    
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, status: newStatus } : s
    ))
    
    setMessage(`Service ${service.name} ${newStatus === 'Running' ? 'started' : 'stopped'}`)
  }

  // Static items for menu to avoid cursor jump
  const menuItems = [
    { label: 'Toggle DevSidecar Core', value: 'server' },
    { label: 'Toggle System Proxy', value: 'proxy' }
  ]

  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.primary}>Home - Service Control</Text>
      
      <Box marginY={1} flexDirection="column" borderStyle="round" borderColor={theme.colors.muted} padding={1}>
        <Text underline>Status:</Text>
        {services.map(s => (
            <Box key={s.id} justifyContent="space-between" width={40}>
                <Text>{s.name}:</Text>
                <Text color={s.status === 'Running' ? theme.colors.accent : theme.colors.muted}>
                    {s.status}
                </Text>
            </Box>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text>Actions:</Text>
        <SelectInput items={menuItems} onSelect={handleSelect} isFocused={isFocused} />
      </Box>

      {message && <Text color={theme.colors.accent} marginTop={1}>{message}</Text>}
