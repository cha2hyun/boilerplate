import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const client = new Client({ name: 'blueprint-mcp-check', version: '1.0.0' })
const transport = new StdioClientTransport({
  command: 'pnpm',
  args: ['exec', 'shadcn', 'mcp'],
  cwd: process.cwd(),
  stderr: 'inherit',
})
try {
  await client.connect(transport)
  const { tools } = await client.listTools()
  console.log('shadcn MCP connected. Available tools:', tools.map((tool) => tool.name).join(', '))
  const search = tools.find((tool) => tool.name === 'search_items_in_registries')
  if (!search) throw new Error('The shadcn registry search tool was not found')
  const result = await client.callTool(
    { name: search.name, arguments: { registries: ['@shadcn'], query: 'sidebar', limit: 3 } },
    undefined,
    { timeout: 30_000 },
  )
  if (result.isError || !JSON.stringify(result.content).includes('sidebar'))
    throw new Error('Registry search failed')
  console.log('Official shadcn registry search passed (sidebar).')
} finally {
  await client.close()
}
