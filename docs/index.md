---
okf_version: '0.2'
title: Dash Starter documentation
description: How to install, configure, customize, test and deploy a product built from the Dash Starter template.
generated: { by: opencode/deepseek-v4.1-flash-free, at: 2026-10-23T00:00:00Z }
---

# Dash Starter documentation

Dash Starter is an AI SaaS starter: accounts, organizations, billing, email, a
model-agnostic AI layer, an in-app chat and an MCP server, in English and Spanish.
This bundle explains how to use it, keep it and ship it.

Start with [getting started](./guides/getting-started.md) if the project is not
running yet, or read [what you get](./guides/what-you-get.md) first.

## Contents

| Folder                      | What it holds                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [Guides](./guides/index.md) | Install, configure, customize, test, deploy and troubleshoot the product.                                                                  |
| Reference                   | The internals: [architecture](./architecture.md), [AI](./ai.md), [billing](./billing.md), [MCP](./mcp.md) and the [harness](./harness.md). |

Recent changes to this bundle are listed in the [change log](./log.md).

## Concept types used in this bundle

| `type`      | Used for                                                   |
| ----------- | ---------------------------------------------------------- |
| `Guide`     | Steps to get something done with the template.             |
| `Reference` | How a part of the template works and where its code lives. |

`index.md` and `log.md` are reserved files in OKF. They are not concepts and carry no `type`.

## The five-minute path

1. `npx create-dash-starter my-product` — or clone this repository and copy the
   environment files.
2. `docker compose up -d --wait` and `docker compose exec api node ace db:seed`.
3. Open <http://localhost:5173>, sign up, and read the verification email in Mailpit.
4. Change the palette, the locale and the name of the product before the first feature.
5. Read [architecture](./architecture.md) before the first change.
