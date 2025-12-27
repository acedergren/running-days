# Running Days MCP Server

MCP (Model Context Protocol) server for the Running Days fitness tracker. Enables LLM assistants to query your running data.

## Tools

| Tool | Description |
|------|-------------|
| `running_days_get_stats` | Get running statistics (days, distance, pace) for a year |
| `running_days_get_recent_runs` | Get a list of recent running activities |
| `running_days_get_goal_progress` | Get progress toward yearly running days goal |
| `running_days_get_monthly_breakdown` | Get monthly breakdown of running data |

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "running-days": {
      "command": "node",
      "args": ["/path/to/running-days/mcp-server/dist/index.js"]
    }
  }
}
```

## Development

```bash
npm run dev  # Run with tsx (no build needed)
```
