---
type: Reference
title: MCP server
description: The MCP endpoint, API keys, scopes, tools, limits and how to connect a client.
tags: [mcp, api-keys, agents, reference]
status: stable
---

# MCP

The starter ships an [MCP](https://modelcontextprotocol.io) server, so an external agent — Claude Desktop, an IDE, an agent of your own — can read the data of an organization and act on it. The server exposes the **tools of the product**: the same ones the assistant of the chat uses, with the same permissions.

- [How it works](#how-it-works)
- [The endpoint](#the-endpoint)
- [The keys](#the-keys)
- [The scopes](#the-scopes)
- [The tools](#the-tools)
- [The limits](#the-limits)
- [Connecting a client](#connecting-a-client)
- [The errors](#the-errors)
- [Testing without a plan](#testing-without-a-plan)

---

## How it works

1. An admin of the organization creates an **API key** in the page `/app/:orgSlug/settings/api-keys`, chooses the scopes it holds and copies the secret, which is shown only once.
2. The client sends the secret in the `Authorization` header of every request to `/mcp`.
3. The API checks the key, the plan of the organization and the rate limits, and then answers with the tools of the product that the scopes of the key allow.
4. Every call is recorded in the `mcp_usage_events` table and counts against the monthly allowance of MCP calls of the plan. The tools that call the model also consume AI credits, like any other feature.

The server is **stateless**: every request builds its own transport and its own server, so it works behind a load balancer that does not keep the connections of the clients. There is no session to open and no event stream to consume — a `GET /mcp` answers with a 405 that says so.

---

## The endpoint

```
POST /mcp
```

The endpoint lives at the root of the API, not under `/api/v1`: the clients of the protocol address it directly.

The request is a JSON-RPC message and the `Accept` header has to name both `application/json` and `text/event-stream`, as the [transport](https://modelcontextprotocol.io/specification/basic/transports) requires:

```bash
curl -X POST https://api.example.com/mcp \
  -H 'Authorization: Bearer dash_xxxxxxxx.yyyyyyyyy' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## The keys

A key belongs to an organization and is managed by its owners and its admins. The endpoints are under the organization:

| Method   | Path                                 | What it does                                         |
| -------- | ------------------------------------ | ---------------------------------------------------- |
| `GET`    | `/api/v1/orgs/:orgSlug/api-keys`     | The keys of the organization and the calls they made |
| `POST`   | `/api/v1/orgs/:orgSlug/api-keys`     | Creates a key and answers with its secret            |
| `DELETE` | `/api/v1/orgs/:orgSlug/api-keys/:id` | Revokes a key                                        |

The secret of a key is **never stored**: the database keeps its hash, so a leaked database does not leak the credentials of the clients. The listing shows the prefix of the key — `dash_ab12cd34` — and the scopes, its creator, the date of its last use and its expiry.

A revoked key keeps its row, so the history of its calls is preserved. The clients that hold it get a 401 from that moment on.

---

## The scopes

The scopes of a key are the abilities of the key. They are stored as the abilities of the token, so the same check runs on every surface.

| Scope       | What it allows                                                      |
| ----------- | ------------------------------------------------------------------- |
| `mcp:read`  | Reading the data of the organization                                |
| `mcp:write` | Acting on it — today, generating text with the model of the product |

A key with only `mcp:read` that calls a tool that needs `mcp:write` gets an MCP error that says so, and the tool does not run. The tools are always advertised, so the client learns that the tool exists and that it is not allowed to use it.

The scopes are declared by the tools themselves, in `apps/api/app/tools/`, and the registry (`apps/api/app/tools/registry.ts`) is the only place that enforces them. The chat and the MCP server share it, so a tool behaves the same on both surfaces.

---

## The tools

| Tool                | Scope       | What it answers                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------ |
| `organization_info` | `mcp:read`  | The name of the organization, its plan and how many members it has |
| `list_members`      | `mcp:read`  | The members of the organization and their role                     |
| `ai_usage_summary`  | `mcp:read`  | The credits of the organization and how many are left              |
| `generate_text`     | `mcp:write` | A short text written with the model of the `fast` alias            |

The answer of a tool is JSON inside the text of the result:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{ "type": "text", "text": "{\"name\":\"Acme Labs\",\"plan\":\"pro\"}" }],
    "isError": false
  }
}
```

A tool that fails answers with `isError: true` and a text that starts with the code of the failure, so the agent can tell a refusal from an error:

```json
{
  "content": [
    {
      "type": "text",
      "text": "E_TOOL_SCOPE: The scope \"mcp:write\" is needed to use the tool \"generate_text\"."
    }
  ],
  "isError": true,
  "_meta": { "code": "E_TOOL_SCOPE" }
}
```

---

## The limits

The limits come from the plan of the organization, so they are read with `EntitlementService.for(organization)` and never from the plan directly.

| Limit               | Entitlement  | What it does                                                |
| ------------------- | ------------ | ----------------------------------------------------------- |
| MCP access          | `mcpEnabled` | Whether the server is reachable at all                      |
| Calls per month     | `mcpCalls`   | How many tool calls the organization can make in the period |
| Requests per minute | `mcpRpm`     | How many requests a key can make in a minute                |

The calls of the period are the ones of the current billing period, and they are counted per key and in total. The page of the keys shows both against the allowance.

Two rate limits run on every request, one for the key and one for the organization, so a key cannot spend the whole allowance of the organization at once. When one of them is over, the answer is a 429 with a `Retry-After` header.

---

## Connecting a client

The page of the API keys shows the configuration of the client once the key is created. It is the same configuration any client understands:

```json
{
  "mcpServers": {
    "dash": {
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer dash_xxxxxxxx.yyyyyyyyy"
      }
    }
  }
}
```

With the [MCP inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector
```

The server is reachable from the outside only when the API is, so the URL of the configuration is the public URL of the API, not the one of the web app.

---

## The errors

The errors of the protocol itself travel inside the result of the call. The errors of the request answer with an HTTP status and a body with a `code`:

| Status | Code                  | When                                                        |
| ------ | --------------------- | ----------------------------------------------------------- |
| 401    | `E_INVALID_API_KEY`   | The key is unknown, was revoked or has expired              |
| 403    | `E_MCP_NOT_ENABLED`   | The plan of the organization does not include the server    |
| 429    | `E_TOO_MANY_REQUESTS` | The key or the organization is over its requests per minute |
| 405    | –                     | A `GET /mcp`: the server has no stream of events            |

The codes of the tools travel in `_meta.code`:

| Code                 | When                                                |
| -------------------- | --------------------------------------------------- |
| `E_TOOL_SCOPE`       | The key does not hold the scope the tool needs      |
| `E_TOOL_FORBIDDEN`   | The caller has no permissions in the organization   |
| `E_TOOL_INPUT`       | The arguments of the tool do not match its schema   |
| `E_TOOL_UNKNOWN`     | There is no tool with that name                     |
| `mcp_quota_exceeded` | The organization has used all the calls of its plan |

---

## Testing without a plan

The server only answers to the organizations whose plan includes it, so the tests of the API give the organization a paid subscription before they talk to it. The keys of a test are created with the service, and the tool `generate_text` uses the stub provider of the tests:

```bash
cd apps/api
node ace test functional --files="mcp.spec.ts"
```

The environment of the tests points the AI to the stub provider with `AI_PROVIDER=stub`, so no key of a provider is needed.
