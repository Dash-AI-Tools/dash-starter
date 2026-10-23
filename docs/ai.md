---
type: Reference
title: AI layer
description: The model-agnostic AI layer: aliases, providers, quotas, credits and images.
tags: [ai, providers, quotas, reference]
status: stable
---

# AI

The AI of the starter is built on the [AI SDK](https://sdk.vercel.ai). Every feature of the product asks for a **purpose** — `chat`, `fast`, `reasoning` or `image` — and never for a model of a vendor, so the model of the product can be changed from the environment without touching the code.

- [How it works](#how-it-works)
- [The aliases](#the-aliases)
- [Configuring a provider](#configuring-a-provider)
- [The Chinese providers](#the-chinese-providers)
- [Ollama](#ollama)
- [Any other OpenAI-compatible endpoint](#any-other-openai-compatible-endpoint)
- [The stub provider](#the-stub-provider)
- [The credits and the quotas](#the-credits-and-the-quotas)
- [The images](#the-images)
- [The errors](#the-errors)
- [Testing without an account](#testing-without-an-account)

---

## How it works

1. The registry of `apps/api/config/ai.ts` is built at boot from the environment. It knows the providers, the models of the aliases, what each model is able to do and what a call to it costs.
2. A feature calls `AiService`, the only door to the provider. The service checks the quota of the organization, applies the timeout, calls the model and records what the call cost.
3. The call is written in the `ai_usage_events` table: the organization, the member, the feature, the alias, the provider, the model, the tokens, the images, the credits, the latency and how it ended.
4. When the organization crosses 80% or 100% of the credits of its plan, the owners and the admins of the organization get an email.

The keys never leave the server: they are read from the environment when a model is built, and they are never sent to the browser.

---

## The aliases

| Alias       | What it is for                                   | Can write | Can stream | Can answer with an object | Can draw |
| ----------- | ------------------------------------------------ | :-------: | :--------: | :-----------------------: | :------: |
| `chat`      | The default of the product: the long answers.    |     ✓     |     ✓      |             ✓             |          |
| `fast`      | The short answers: summaries, classifications.   |     ✓     |     ✓      |             ✓             |          |
| `reasoning` | The answers that need to think before answering. |     ✓     |     ✓      |             ✓             |          |
| `image`     | The pictures of the product.                     |           |            |                           |    ✓     |

An alias is a promise: the feature asks for a purpose and the registry points it at a model. The capabilities of a model are the intersection of what the alias promises and what the provider can do, so an alias that points at a provider without images simply cannot draw.

The default models of every provider are the ones the provider is known for. The operator points the aliases at the models of their own account with the environment:

```bash
# apps/api/.env
AI_PROVIDER=openai
AI_CHAT_MODEL=gpt-4.1
AI_FAST_MODEL=gpt-4.1-mini
AI_REASONING_MODEL=o4-mini
AI_IMAGE_MODEL=gpt-image-1
```

An alias can also name its own provider, so the chat can run on one vendor and the images on another:

```bash
AI_PROVIDER=openai
AI_IMAGE_PROVIDER=google
AI_IMAGE_MODEL=imagen-4.0-generate-001
```

An alias without a model of its own cannot be used: the service fails fast with a configuration error that names the alias. The providers of the table above know a default model for the aliases of text, so `AI_PROVIDER=deepseek` and its key are enough for the chat.

---

## Configuring a provider

Set `AI_PROVIDER` to the provider of the aliases and give it its key:

```bash
# apps/api/.env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-api-key
AI_CHAT_MODEL=deepseek-chat
```

| Provider   | Variable                       | Base URL                                            |
| ---------- | ------------------------------ | --------------------------------------------------- |
| Anthropic  | `ANTHROPIC_API_KEY`            | —                                                   |
| OpenAI     | `OPENAI_API_KEY`               | —                                                   |
| Google     | `GOOGLE_GENERATIVE_AI_API_KEY` | —                                                   |
| DeepSeek   | `DEEPSEEK_API_KEY`             | —                                                   |
| OpenRouter | `OPENROUTER_API_KEY`           | —                                                   |
| Qwen       | `QWEN_API_KEY`                 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Kimi       | `KIMI_API_KEY`                 | `https://api.moonshot.cn/v1`                        |
| GLM        | `GLM_API_KEY`                  | `https://open.bigmodel.cn/api/paas/v4`              |
| Ollama     | `OLLAMA_API_KEY`               | `http://localhost:11434/v1`                         |
| Compatible | `COMPATIBLE_API_KEY`           | `COMPATIBLE_BASE_URL`                               |

`AI_TIMEOUT_MS` bounds every call to the provider. The default is 60 seconds.

The keys are optional outside production: a provider without a key falls back to the stub, so the stack boots and the whole test suite passes with no third-party account. In production the stub is refused and a provider without a key stops the API at boot.

---

## The Chinese providers

Qwen, Kimi and GLM talk the OpenAI dialect, so they are served by the OpenAI-compatible provider with their own base URL. Give them their key and point an alias at them:

```bash
# Alibaba Cloud DashScope
AI_PROVIDER=qwen
QWEN_API_KEY=your-api-key
AI_CHAT_MODEL=qwen-plus
AI_FAST_MODEL=qwen-turbo
```

```bash
# Moonshot
AI_PROVIDER=kimi
KIMI_API_KEY=your-api-key
AI_CHAT_MODEL=moonshot-v1-8k
```

```bash
# Zhipu
AI_PROVIDER=glm
GLM_API_KEY=your-api-key
AI_CHAT_MODEL=glm-4-plus
```

---

## Ollama

Ollama runs the models on the machine of the operator, so it needs no key:

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
AI_CHAT_MODEL=llama3.2
```

`OLLAMA_API_KEY` is sent as the key of the request. The provider accepts an empty one, so the variable can be left empty.

---

## Any other OpenAI-compatible endpoint

A provider that speaks the OpenAI dialect needs a base URL, a key and a model:

```bash
AI_PROVIDER=compatible
COMPATIBLE_BASE_URL=https://api.example.com/v1
COMPATIBLE_API_KEY=your-api-key
AI_CHAT_MODEL=the-model-of-the-endpoint
```

The same provider can serve more than one alias, and the aliases do not have to share the same model.

---

## The stub provider

With no key configured, outside production, the registry points at the **stub**: a deterministic provider that answers with the same text, with an object that matches the schema of the request and with a placeholder image. It never leaves the machine, so the product can be developed and tested without an account of any vendor.

The answer of the stub says so, so a stub answer is never mistaken for a real one:

```
This answer comes from the stub provider. Configure a provider in the environment to get real replies.
```

The stub uses no tokens, so the calls of the stub cost no credits.

---

## The credits and the quotas

Every call costs credits, according to the prices of its alias:

| Alias       | Credits per 1,000 input tokens | Credits per 1,000 output tokens | Credits per image |
| ----------- | ------------------------------ | ------------------------------- | ----------------- |
| `chat`      | 1                              | 3                               | —                 |
| `fast`      | 0.25                           | 0.75                            | —                 |
| `reasoning` | 3                              | 9                               | —                 |
| `image`     | —                              | —                               | 10                |

> The prices are placeholders: replace them with the ones of the models the aliases point at, in `apps/api/config/ai.ts`.

The organization has the credits of its plan every period — 100 on the free plan, 1000 on Pro and 5000 on Business. When they run out, the next call is refused with **402** and the code `ai_quota_exceeded`, and no request reaches the provider. The admins of the organization get an email at 80% and at 100%, once per period.

The period of a paid organization is the period of its subscription, and the calendar month for a free one.

---

## The images

The images are written to the disk of the application, in the folder of the organization, and the service answers with their URL:

```
organizations/<organization-id>/ai/<uuid>.png
```

The URL is served by the API under `/api/uploads`, the same origin as the web app, so an image needs no CORS. The only disk that is registered is the local one, so the images live in the disk of the machine (`DRIVE_ROOT`). A deployment that stores them outside of the machine registers the S3 disk of `apps/api/config/drive.ts` with the `S3_*` variables of the environment, adds the driver of the disk (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) to the API and widens the `DRIVE_DISK` of `apps/api/start/env.ts`: the environment refuses any disk that is not registered, so a deployment never writes to the local disk by mistake.

---

## The errors

| Code                   | Status | When                                                    |
| ---------------------- | ------ | ------------------------------------------------------- |
| `ai_quota_exceeded`    | 402    | The organization has used all the credits of its plan.  |
| `ai_unavailable`       | 503    | The provider did not answer, or answered with an error. |
| `ai_alias_unavailable` | 500    | The alias points at a model that cannot do the request. |

The details of the provider never reach the client: a timeout, a rate limit or a rejected key is always the same "the AI is temporarily unavailable" answer. The details stay in the log of the server.

---

## Testing without an account

Nothing in the test suite needs an account of any vendor:

- The registry is built by a pure function, `buildAiRegistry`, so the aliases, the capabilities and the stub are tested without touching the network.
- The service takes the models as an argument, so a test can give it a mock that writes a fixed text, or one that fails on purpose.
- The stub provider is the default of the test environment, so the functional tests run against it.
