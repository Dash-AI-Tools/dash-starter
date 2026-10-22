# mcp-server Specification

## Purpose

Exposes selected product capabilities to external AI agents through a Model Context Protocol server, authenticated per organization, metered against plan quotas and protected by rate limits.

## Requirements

### Requirement: MCP endpoint
The API SHALL serve an MCP server over the Streamable HTTP transport at `/mcp`, advertising the product name, version and the tools enabled for the calling organization.

#### Scenario: List tools
- **WHEN** an MCP client with a valid key sends `tools/list`
- **THEN** it receives the enabled tools with names, descriptions and JSON input schemas

### Requirement: Organization API keys
Owners and admins SHALL be able to create, name, scope and revoke API keys for their organization; the secret SHALL be shown once, stored only as a hash, and each key SHALL record its creator, scopes, last-used time and optional expiry.

#### Scenario: Create key
- **WHEN** an admin creates a key named "Claude Desktop" with scope `mcp:read`
- **THEN** the full secret is displayed once and later listings show only its prefix

#### Scenario: Revoked key
- **WHEN** a client calls `/mcp` with a revoked or expired key
- **THEN** the request is rejected with 401 and no tool runs

#### Scenario: Member cannot manage keys
- **WHEN** a member calls the API key management endpoints
- **THEN** the API responds 403

### Requirement: Scoped tools
Each tool SHALL declare the scope it requires and SHALL act only on the key's organization; the template SHALL ship read tools (organization info, list members, AI usage summary) and one AI generation tool built on the AI provider.

#### Scenario: Scope missing
- **WHEN** a key with only `mcp:read` calls a tool requiring `mcp:write`
- **THEN** the call returns an MCP error indicating insufficient scope

### Requirement: Metering
Every MCP tool call SHALL be recorded with organization, key, tool, outcome and duration, and SHALL count against the plan's monthly MCP call allowance; AI tools SHALL additionally consume AI credits.

#### Scenario: Allowance exhausted
- **WHEN** an organization has used its monthly MCP call allowance
- **THEN** further tool calls return an MCP error with code `mcp_quota_exceeded` and are not executed

#### Scenario: Usage visible to admins
- **WHEN** an admin opens the API keys page
- **THEN** they see calls used this period per key and in total against the allowance

### Requirement: Rate limiting
MCP requests SHALL be rate limited per API key and per organization using limits from the plan, returning HTTP 429 with a retry-after value when exceeded.

#### Scenario: Burst over limit
- **WHEN** a key exceeds its per-minute request limit
- **THEN** further requests in that window receive 429 with `Retry-After`

### Requirement: Plan gating
MCP access SHALL be available only on plans whose entitlements enable it.

#### Scenario: Free plan
- **WHEN** an organization on a plan without MCP access creates or uses a key
- **THEN** key creation is refused with an upgrade prompt and existing keys receive 403 at `/mcp`
