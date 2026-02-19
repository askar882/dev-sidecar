import React from 'react'
import { Box, Text } from 'ink'
import { theme } from '../style/theme.js'

export default function ProxyPage() {
  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.primary}>Proxy Settings</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>System Proxy: <Text color={theme.colors.accent}>System Default</Text></Text>
        <Text>PAC URL: <Text color={theme.colors.muted}>http://127.0.0.1:11223/pac</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          Proxy settings are managed automatically. Check 'user_config.json5' for advanced configuration.
        </Text>
      </Box>
}
