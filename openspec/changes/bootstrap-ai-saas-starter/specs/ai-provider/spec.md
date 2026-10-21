# Spec Delta

## Purpose

Gives every product feature one model-agnostic service to generate text, streamed text, structured data (such as reports) and images, with configurable models from any vendor and per-organization usage metering and quotas.

## ADDED Requirements

### Requirement: Model-agnostic generation
The AI service SHALL expose text generation, streaming text generation, schema-validated structured generation and image generation, independent of the underlying model vendor.

#### Scenario: Structured report
- **WHEN** a feature asks for a report matching a declared schema
- **THEN** the service returns an object that validates against that schema or a typed error

#### Scenario: Image generation
- **WHEN** a feature requests an image from a prompt with a size
- **THEN** the service returns the image stored in file storage with a URL accessible to the requesting organization

### Requirement: Any provider, including Chinese models
The service SHALL support Anthropic, OpenAI, Google, DeepSeek, Alibaba Qwen, Moonshot Kimi, Zhipu GLM, OpenRouter, local Ollama and any OpenAI-compatible endpoint, configured by environment without code changes.

#### Scenario: Switch to DeepSeek
- **WHEN** an operator maps the `chat` alias to a DeepSeek model and sets its API key
- **THEN** chat and all features using that alias run on DeepSeek after restart with no code change

#### Scenario: Custom OpenAI-compatible endpoint
- **WHEN** an operator configures a base URL, API key and model id for an OpenAI-compatible provider
- **THEN** that model can be mapped to any alias

### Requirement: Model aliases
Features SHALL request models by purpose alias (at least `chat`, `fast`, `reasoning`, `image`) rather than vendor model ids, and each alias SHALL map to a configured provider model and capability set.

#### Scenario: Alias lacks capability
- **WHEN** a feature requests image generation from an alias whose model cannot generate images
- **THEN** the service fails fast with a configuration error naming the alias

### Requirement: Stub provider for development and tests
When no provider key is configured outside production, the service SHALL use a deterministic stub provider that returns canned text, structured objects and placeholder images.

#### Scenario: No AI key locally
- **WHEN** a developer uses AI chat with no provider configured
- **THEN** a deterministic stub reply is streamed and the UI marks it as stub output

### Requirement: Usage metering
Every AI call SHALL record organization, user, feature, alias, provider model, input and output tokens, images generated, computed credits, latency and outcome.

#### Scenario: Usage recorded
- **WHEN** a chat reply completes using 1,200 input and 300 output tokens
- **THEN** a usage record with those token counts and the computed credits is stored for the organization

#### Scenario: Failed call
- **WHEN** a provider call fails
- **THEN** a usage record with outcome `error` and zero credits is stored

### Requirement: Credit quotas
Each organization SHALL have a monthly AI credit allowance from its plan; when the allowance is exhausted further AI calls SHALL be refused with HTTP 402 and code `ai_quota_exceeded` until the next period or an upgrade, and admins SHALL be emailed at 80% and 100%.

#### Scenario: Quota exhausted
- **WHEN** an organization on a plan with 1,000 monthly credits has used 1,000 credits
- **THEN** the next AI request is refused with `ai_quota_exceeded` and no provider call is made

#### Scenario: Usage visible
- **WHEN** an admin opens billing settings
- **THEN** they see credits used and remaining for the current period

### Requirement: Safe provider handling
Provider API keys SHALL stay server-side, calls SHALL have timeouts, and provider errors SHALL be mapped to localized, non-leaking user messages.

#### Scenario: Provider timeout
- **WHEN** a provider does not respond within the configured timeout
- **THEN** the caller receives a localized "AI temporarily unavailable" error without provider details
