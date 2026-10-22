# ai-chat Specification

## Purpose

Gives organization members an in-app AI assistant with streamed replies, persisted private conversations and tools that act on product data within the user's permissions.

## Requirements

### Requirement: Streaming chat
Members SHALL be able to send messages to the assistant and see the reply stream token by token, with the ability to stop generation.

#### Scenario: Send message
- **WHEN** a member sends "Summarize our members by role"
- **THEN** the reply streams into the conversation and is persisted when complete

#### Scenario: Stop generation
- **WHEN** the member clicks stop mid-reply
- **THEN** streaming stops, the partial reply is kept and usage is metered for tokens consumed

### Requirement: Conversation history
Conversations SHALL be scoped to an organization and private to the user who created them; users SHALL be able to list, rename, delete and continue them, and new conversations SHALL get an auto-generated title.

#### Scenario: Privacy between members
- **WHEN** a member lists conversations
- **THEN** only their own conversations in the active organization are returned

#### Scenario: Continue conversation
- **WHEN** a member reopens a past conversation and sends a message
- **THEN** the assistant receives the prior messages as context

### Requirement: Rich message rendering
Assistant messages SHALL render Markdown, code blocks with copy, tables and tool-call activity, and SHALL sanitize output so no HTML or script from model output executes.

#### Scenario: Script in model output
- **WHEN** a model reply contains a `<script>` tag
- **THEN** it is displayed as text and not executed

### Requirement: Tools with caller permissions
The assistant SHALL be able to call registered product tools, each executed with the requesting user's organization role and denied when the role lacks permission; tool calls SHALL be shown to the user.

#### Scenario: Member asks for billing data
- **WHEN** a member's chat triggers a tool that requires admin role
- **THEN** the tool returns a permission error to the model and no data is disclosed

### Requirement: Localized assistant
The chat UI SHALL be localized and the assistant SHALL be instructed to answer in the user's locale unless the user writes in another language.

#### Scenario: Spanish user
- **WHEN** a user with locale `es` starts a conversation
- **THEN** the system instructions request Spanish replies

### Requirement: Quota and rate feedback
Chat SHALL show remaining AI credits when below 20% and SHALL show a localized upgrade message when the quota is exhausted; per-user request rate SHALL be limited.

#### Scenario: Quota exhausted in chat
- **WHEN** a member sends a message after the organization exhausted its credits
- **THEN** no reply is generated and an upgrade message is shown (admins see a link to billing)
