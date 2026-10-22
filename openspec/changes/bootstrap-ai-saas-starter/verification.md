# Verification matrix

Every scenario of the change points at the test that proves it. The suites are
run with:

| Suite | Command |
| --- | --- |
| API | `cd apps/api && node ace test` |
| Web | `cd apps/web && npx vitest run` |
| End to end | `cd e2e && npx playwright test` |
| Installer | `cd packages/create-app && node --test "test/**/*.test.js"` |
| Generated project | the run of the task 17.1, described at the end of this file |

The scenarios that only the product itself can prove (a stack that boots on a
clean machine, a rebranded project that has no trace of the template) point at
that run instead of at a unit test.

## ai-chat

| Scenario | Test | Suite |
| --- | --- | --- |
| Send message | `apps/api/tests/functional/chat.spec.ts` "streams the answer of the assistant and keeps the conversation" | API |
| Send message | `apps/web/src/components/chat/chat.test.tsx` "streams the answer of the assistant" | Web |
| Send message | `e2e/specs/chat.spec.ts` "answers the question of a member" | e2e |
| Stop generation | `apps/web/src/components/chat/chat.test.tsx` "stops the answer and keeps what was written" | Web |
| Stop generation | `apps/api/tests/unit/ai_service.spec.ts` "meters the tokens of an answer that was stopped" | API |
| Privacy between members | `apps/api/tests/functional/chat.spec.ts` "lists only the conversations of the member" | API |
| Privacy between members | `apps/api/tests/functional/chat.spec.ts` "hides the conversation of another member of the organization" | API |
| Continue conversation | `apps/api/tests/functional/chat.spec.ts` "keeps the messages of the conversation as the context of the next one" | API |
| Script in model output | `apps/web/src/components/chat/chat.test.tsx` "shows the script of the model as text and never runs it" | Web |
| Member asks for billing data | `apps/api/tests/unit/chat.spec.ts` "answers the model with a permission error when a member asks for the billing data" | API |
| Member asks for billing data | `apps/api/tests/unit/tool_registry.spec.ts` "denies a tool that the role of the caller cannot use" | API |
| Spanish user | `apps/api/tests/unit/chat.spec.ts` "asks for a Spanish answer when the member writes in Spanish" | API |
| Spanish user | `e2e/specs/spanish.spec.ts` "recorre el producto sin dejar textos sin traducir" | e2e |
| Quota exhausted in chat | `apps/api/tests/functional/chat.spec.ts` "refuses the message when the organization has no credits left" | API |
| Quota exhausted in chat | `apps/web/src/components/chat/chat.test.tsx` "asks an admin to upgrade the plan when there are no credits left" | Web |

## ai-provider

| Scenario | Test | Suite |
| --- | --- | --- |
| Structured report | `apps/api/tests/unit/ai_service.spec.ts` "answers with an object that matches the schema" | API |
| Image generation | `apps/api/tests/functional/ai_images.spec.ts` "stores the image in the folder of the organization" | API |
| Switch to DeepSeek | `apps/api/tests/unit/ai_registry.spec.ts` "points every alias at the provider and the model of the environment" | API |
| Switch to DeepSeek | `apps/api/tests/unit/ai_registry.spec.ts` "lets an alias run on another provider" | API |
| Switch to DeepSeek | `apps/api/tests/unit/ai_registry.spec.ts` "refuses a provider that does not exist" | API |
| Custom OpenAI-compatible endpoint | `apps/api/tests/unit/ai_registry.spec.ts` "maps any alias to a custom OpenAI-compatible endpoint" | API |
| Alias lacks capability | `apps/api/tests/unit/ai_service.spec.ts` "refuses an alias whose model cannot do what the feature needs" | API |
| Alias lacks capability | `apps/api/tests/unit/ai_registry.spec.ts` "takes away the capabilities the provider cannot do" | API |
| No AI key locally | `apps/api/tests/unit/ai_registry.spec.ts` "uses the stub when the provider has no key" | API |
| No AI key locally | `apps/web/src/components/chat/chat.test.tsx` "shows that the provider is a stub" | Web |
| Usage recorded | `apps/api/tests/unit/ai_service.spec.ts` "answers with the text of the model and records what the call cost" | API |
| Failed call | `apps/api/tests/unit/ai_service.spec.ts` "hides the failure of the provider and records it as an error" | API |
| Quota exhausted | `apps/api/tests/unit/ai_service.spec.ts` "refuses the call when the organization has no credits left" | API |
| Usage visible | `apps/api/tests/functional/billing.spec.ts` "shows the plan, the subscription and the usage" | API |
| Usage visible | `apps/web/src/pages/billing.test.tsx` "shows the usage against the limits of the plan" | Web |
| Provider timeout | `apps/api/tests/unit/ai_service.spec.ts` "gives up on a provider that does not answer in time" | API |

## billing-plans

| Scenario | Test | Suite |
| --- | --- | --- |
| Add a plan without code | `apps/api/tests/functional/billing.spec.ts` "adds a plan without code" | API |
| Add a plan without code | `apps/web/src/pages/public.test.tsx` "lists the plans of the catalog with their monthly price" | Web |
| Deactivate a plan | `apps/api/tests/functional/billing.spec.ts` "keeps the plan of the subscribers when the owner deactivates it" | API |
| Price change preserves existing subscribers | `apps/api/tests/functional/billing.spec.ts` "keeps the price of the subscribers when the price of the catalog changes" | API |
| Two active prices for one interval | `apps/api/tests/functional/billing.spec.ts` "the database refuses two active prices for the same interval" | API |
| New organization | `apps/api/tests/functional/billing.spec.ts` "gives the free plan to an organization without a subscription" | API |
| Seat limit from plan | `apps/api/tests/unit/entitlements.spec.ts` "refuses a usage that does not fit in the limit" | API |
| Seat limit from plan | `apps/api/tests/functional/organizations.spec.ts` "refuses an invitation when the plan has no seats left" | API |
| Unlimited value | `apps/api/tests/unit/entitlements.spec.ts` "never refuses a usage when the limit does not exist" | API |
| Unlimited value | `apps/api/tests/functional/organizations.spec.ts` "invites somebody when the plan does not limit the seats" | API |
| Sync new price | `apps/api/tests/functional/billing.spec.ts` "gives the paid prices the product of the provider" | API |
| Sync new price | `apps/api/tests/functional/billing.spec.ts` "creates the products that the catalog needs" | API |
| Sync new price | `apps/api/tests/functional/billing.spec.ts` "creates again the product that the provider does not know" | API |
| Spanish plans | `apps/api/tests/functional/billing.spec.ts` "writes the plans in the language of the visitor" | API |

## cookie-consent

| Scenario | Test | Suite |
| --- | --- | --- |
| First visit | `apps/web/src/components/consent/consent.test.tsx` "asks for the consent on the first visit, with the three actions" | Web |
| Choice already made | `apps/web/src/components/consent/consent.test.tsx` "does not ask again when the choice is already made" | Web |
| Customize categories | `apps/web/src/components/consent/consent.test.tsx` "stores only the category the visitor grants in the preferences" | Web |
| Rejected analytics | `apps/web/src/components/consent/consent.test.tsx` "rejects the non-essential cookies and remembers the choice" | Web |
| Consent granted later | `apps/web/src/components/consent/consent.test.tsx` "loads a script only when its category is granted" | Web |
| Policy version bump | `apps/web/src/components/consent/consent.test.tsx` "asks again when the policy version changes" | Web |
| Consent expiry | `apps/web/src/components/consent/consent.test.tsx` "asks again when the choice is older than twelve months" | Web |
| Change mind | `apps/web/src/components/consent/consent.test.tsx` "opens the preferences when the application asks for them" | Web |
| Change mind | `apps/web/src/pages/public.test.tsx` "opens the preferences of the cookies from the footer" | Web |
| Change mind | `e2e/specs/preferences.spec.ts` "accepts the cookies and stops asking" | e2e |

## dashboard-shell

| Scenario | Test | Suite |
| --- | --- | --- |
| Mobile navigation | `apps/web/src/pages/app-shell.test.tsx` "hides the navigation behind a menu button on a narrow screen" | Web |
| Collapsed state remembered | `apps/web/src/pages/app-shell.test.tsx` "remembers the collapsed navigation" | Web |
| Member navigation | `apps/web/src/pages/app-shell.test.tsx` "keeps the billing and the API keys away from a member" | Web |
| Create from switcher | `apps/web/src/pages/app-shell.test.tsx` "starts the setup of a new organization from the switcher" | Web |
| Keyboard open | `apps/web/src/pages/app-shell.test.tsx` "opens the command palette with the keyboard and focuses the input" | Web |
| Search members | `apps/web/src/pages/app-shell.test.tsx` "groups the records found by the search providers" | Web |
| Home renders | `apps/web/src/pages/dashboard.test.tsx` "shows the numbers of the workspace, the usage and the latest activity" | Web |
| Expired session | `apps/web/src/pages/app-shell.test.tsx` "sends the visitor to the login page when the session expires" | Web |
| Expired session | `apps/web/src/pages/login-page.test.tsx` "signs in and lands on the page the visitor wanted" | Web |

## dev-environment

| Scenario | Test | Suite |
| --- | --- | --- |
| Developer boots the stack | the run of the task 17.1: the stack of a generated project answers on its three URLs | Run |
| Developer boots the stack | `apps/api/tests/unit/stack.spec.ts` "serves the web app and the API from one origin" | API |
| Code change reloads | `apps/api/tests/unit/stack.spec.ts` "reloads the code of the developer without restarting the containers" | API |
| Same-origin serving | `apps/api/tests/unit/stack.spec.ts` "serves the web app and the API from one origin" | API |
| Pending migrations | `apps/api/tests/unit/stack.spec.ts` "runs the migrations before the API accepts traffic" | API |
| Missing APP_KEY | `apps/api/tests/unit/env.spec.ts` "fails without APP_KEY" | API |
| Production without email provider | `apps/api/tests/unit/env.spec.ts` "fails in production without BREVO_API_KEY" | API |
| Database down | `apps/api/tests/functional/health.spec.ts` "reports degraded when the database is unreachable" | API |
| Seeds rerun | `apps/api/tests/functional/billing.spec.ts` "writes the catalog again without duplicating the plans" | API |
| Seeds rerun | `apps/api/tests/functional/demo.spec.ts` "does not duplicate the demo account when it runs again" | API |
| Demo data in production | `apps/api/tests/functional/demo.spec.ts` "does not create the demo account in production" | API |

## legal-pages

| Scenario | Test | Suite |
| --- | --- | --- |
| View terms | `apps/web/src/pages/public.test.tsx` "shows the terms with their version, their date and the notice of the template" | Web |
| View terms | `apps/web/src/pages/public.test.tsx` "shows the terms in Spanish" | Web |
| Cookie table | `apps/web/src/pages/public.test.tsx` "shows the privacy policy with the table of the cookies" | Web |
| Placeholder notice | `apps/web/src/pages/public.test.tsx` "shows the terms with their version, their date and the notice of the template" | Web |
| Terms version stored | `apps/api/tests/functional/auth.spec.ts` "creates the account, sends the verification email and signs the visitor in" | API |
| Terms updated | `apps/web/src/pages/profile.test.tsx` "asks the visitor to accept the new terms" | Web |
| Terms updated | `apps/api/tests/functional/profile.spec.ts` "accepts the current version of the terms" | API |

## localization

| Scenario | Test | Suite |
| --- | --- | --- |
| Full Spanish session | `e2e/specs/spanish.spec.ts` "recorre el producto sin dejar textos sin traducir" | e2e |
| Anonymous Spanish browser | `apps/web/src/lib/i18n.test.tsx` "picks Spanish from a regional browser language" | Web |
| User preference wins | `apps/api/tests/functional/localization.spec.ts` "the preference of the user wins over the browser language" | API |
| User preference wins | `apps/web/src/pages/profile.test.tsx` "remembers the language of the visitor on the server" | Web |
| Switch on pricing | `apps/web/src/components/language-switcher.test.tsx` "keeps the current route and query string" | Web |
| Switch on pricing | `apps/web/src/pages/public.test.tsx` "shows the title of the page in Spanish" | Web |
| Spanish validation error | `apps/api/tests/functional/localization.spec.ts` "a Spanish validation error is localized and keeps its rule code" | API |
| Currency formatting | `apps/web/src/lib/i18n.test.tsx` "formats a currency with the locale conventions" | Web |
| Missing Spanish key | `apps/api/tests/unit/translations.spec.ts` "every locale has the same keys" | API |
| Missing Spanish key | `apps/web/src/lib/i18n.test.tsx` "keeps the same keys in both catalogs" | Web |
| lang attribute | `apps/web/src/components/language-switcher.test.tsx` "switches the locale, persists the cookie and syncs the html lang attribute" | Web |
| lang attribute | `e2e/specs/spanish.spec.ts` "recorre el producto sin dejar textos sin traducir" | e2e |

## mcp-server

| Scenario | Test | Suite |
| --- | --- | --- |
| List tools | `apps/api/tests/functional/mcp.spec.ts` "lists the tools of the product" | API |
| Create key | `apps/api/tests/functional/api_keys.spec.ts` "shows the secret of a key only once" | API |
| Create key | `apps/web/src/pages/api-keys.test.tsx` "creates a key and shows its secret only once" | Web |
| Revoked key | `apps/api/tests/functional/mcp.spec.ts` "refuses a revoked key" | API |
| Revoked key | `apps/api/tests/functional/api_keys.spec.ts` "revokes a key and keeps the history of its calls" | API |
| Member cannot manage keys | `apps/api/tests/functional/api_keys.spec.ts` "does not let the members of the organization manage the keys" | API |
| Scope missing | `apps/api/tests/functional/mcp.spec.ts` "refuses a tool the key has no scope for" | API |
| Allowance exhausted | `apps/api/tests/functional/mcp.spec.ts` "refuses the calls over the allowance of the plan" | API |
| Usage visible to admins | `apps/web/src/pages/api-keys.test.tsx` "shows the keys and the calls of the period" | Web |
| Burst over limit | `apps/api/tests/functional/mcp.spec.ts` "answers 429 when the burst of the key is over the limit" | API |
| Free plan | `apps/api/tests/functional/api_keys.spec.ts` "refuses the organizations whose plan does not include the MCP server" | API |
| Free plan | `apps/api/tests/functional/mcp.spec.ts` "refuses a key of an organization whose plan does not include the MCP" | API |
| Free plan | `apps/web/src/pages/api-keys.test.tsx` "tells the admins when the plan does not reach the server" | Web |

## org-onboarding

| Scenario | Test | Suite |
| --- | --- | --- |
| New user | `apps/web/src/pages/app-shell.test.tsx` "sends a visitor without an organization to the setup" | Web |
| New user | `apps/api/tests/functional/onboarding.spec.ts` "starts at the details step when the user has no organization" | API |
| User with pending invitation | `apps/api/tests/functional/onboarding.spec.ts` "offers the invitations addressed to the email of the user" | API |
| User with pending invitation | `apps/web/src/pages/organizations.test.tsx` "asks an anonymous visitor to create an account with the invited email" | Web |
| Resume onboarding | `apps/api/tests/functional/onboarding.spec.ts` "resumes at the use case step when the organization is already created" | API |
| Resume onboarding | `apps/web/src/pages/onboarding.test.tsx` "resumes at the step the visitor left" | Web |
| Skip invites | `apps/api/tests/functional/onboarding.spec.ts` "skips the invitations without sending anything" | API |
| Skip invites | `apps/web/src/pages/onboarding.test.tsx` "skips the invitations without sending anything" | Web |
| Preselected plan | `apps/web/src/pages/onboarding.test.tsx` "preselects the plan chosen in the pricing page" | Web |
| Preselected plan | `apps/web/src/pages/public.test.tsx` "sends an anonymous visitor to the sign-up with the plan they chose" | Web |
| Checkout cancelled | `apps/api/tests/functional/onboarding.spec.ts` "finishes the setup on the free plan when the checkout is cancelled" | API |
| Checkout cancelled | `apps/web/src/pages/dashboard.test.tsx` "leaves the plan of the checklist open when the organization is on the free plan" | Web |
| Finished | `apps/api/tests/functional/onboarding.spec.ts` "saves the plan and finishes the setup" | API |
| Finished | `apps/web/src/pages/onboarding.test.tsx` "lands on the dashboard when the setup is finished" | Web |
| Finished | `e2e/specs/onboarding.spec.ts` "creates the organization and reaches the dashboard" | e2e |

## organizations

| Scenario | Test | Suite |
| --- | --- | --- |
| Create with slug | `apps/api/tests/functional/organizations.spec.ts` "creates the organization with a suggested slug and makes the caller its owner" | API |
| Slug taken | `apps/api/tests/functional/organizations.spec.ts` "refuses a slug that is already taken and suggests another one" | API |
| Member opens billing settings | `apps/api/tests/functional/organizations.spec.ts` "refuses an admin action to a member" | API |
| Member opens billing settings | `apps/web/src/pages/app-shell.test.tsx` "keeps the billing and the API keys away from a member" | Web |
| Last owner demotion | `apps/api/tests/functional/organizations.spec.ts` "refuses to demote the last owner" | API |
| Last owner demotion | `apps/api/tests/functional/organizations.spec.ts` "refuses to leave the organization as the last owner" | API |
| Cross-tenant access | `apps/api/tests/functional/organizations.spec.ts` "hides the organization of another tenant" | API |
| Cross-tenant access | `apps/api/tests/functional/organizations.spec.ts` "hides the organization of another tenant even with a valid member" | API |
| Invite new person | `apps/api/tests/functional/organizations.spec.ts` "invites somebody and lists the pending invitation" | API |
| Invite new person | `apps/api/tests/functional/mail.spec.ts` "the invitation carries the organization, the inviter and the accept link" | API |
| Invite new person | `e2e/specs/onboarding.spec.ts` "invites a teammate that joins the organization" | e2e |
| Accept as new user | `apps/api/tests/functional/organizations.spec.ts` "accepts the invitation of the same email address" | API |
| Accept as new user | `apps/web/src/pages/organizations.test.tsx` "asks an anonymous visitor to create an account with the invited email" | Web |
| Email mismatch | `apps/api/tests/functional/organizations.spec.ts` "refuses an invitation that goes to another email address" | API |
| Email mismatch | `apps/web/src/pages/organizations.test.tsx` "refuses an invitation that was sent to another email address" | Web |
| Seat limit | `apps/api/tests/functional/organizations.spec.ts` "refuses an invitation when the plan has no seats left" | API |
| Remove member | `apps/api/tests/functional/organizations.spec.ts` "removes a member, who loses the access right away" | API |
| Switch | `apps/web/src/pages/app-shell.test.tsx` "remembers the organization on the server and moves to it" | Web |
| Slug change | `apps/api/tests/functional/organizations.spec.ts` "does not resolve the old slug after the change" | API |
| Delete organization with subscription | `apps/api/tests/functional/organizations.spec.ts` "cancels the subscription of the provider before deleting the organization" | API |

## project-installer

| Scenario | Test | Suite |
| --- | --- | --- |
| Create project in a new directory | `packages/create-app/test/install.test.js` "a project is generated from a local template" | Installer |
| Create project in a new directory | the run of the task 17.1: the installer writes a whole project | Run |
| Target directory is not empty | `packages/create-app/test/install.test.js` "a directory that is not empty is refused" | Installer |
| Non-interactive run | `packages/create-app/test/install.test.js` "a project is generated from a local template" | Installer |
| Invalid slug | `packages/create-app/test/identity.test.js` "an invalid identity is refused" | Installer |
| No template name remains | `packages/create-app/test/install.test.js` "no placeholder of the template survives in the project" | Installer |
| No template name remains | the run of the task 17.1: the generated project holds no name of the template | Run |
| Secrets are unique per project | `packages/create-app/test/install.test.js` "two projects do not share their secrets" | Installer |
| Provider keys skipped | `packages/create-app/test/env.test.js` "the keys of the providers land in their place" | Installer |
| Provider keys skipped | the run of the task 17.1: the project boots with the stub provider and no key | Run |
| Secrets are not committed | `packages/create-app/test/install.test.js` "the environment files carry the secrets of the project" | Installer |
| Secrets are not committed | the run of the task 17.1: the `.env` of the generated project is ignored by Git | Run |
| GitHub repository requested | `packages/create-app/test/git.test.js` "the remote is created in GitHub" | Installer |
| GitHub CLI unavailable | `packages/create-app/test/git.test.js` "a machine without the GitHub CLI keeps the local repository" | Installer |
| First boot succeeds | `packages/create-app/test/boot.test.js` "the stack is started and seeded" | Installer |
| First boot succeeds | the run of the task 17.1: the stack of the generated project answers | Run |
| Docker not available | `packages/create-app/test/install.test.js` "a machine without Docker keeps the project and the commands to run later" | Installer |
| Clean output | `packages/create-app/test/install.test.js` "the installer and the history of the change do not travel" | Installer |

## public-site

| Scenario | Test | Suite |
| --- | --- | --- |
| Anonymous visitor | `apps/web/src/pages/public.test.tsx` "shows the hero, the features, the pricing teaser, the FAQ and the call to action" | Web |
| Authenticated visitor | `apps/web/src/pages/public.test.tsx` "sends a signed-in visitor to the dashboard instead of the login" | Web |
| Toggle interval | `apps/web/src/pages/public.test.tsx` "shows the yearly price and the saving against twelve monthly payments" | Web |
| Plan without yearly price | `apps/web/src/pages/public.test.tsx` "says that a plan without a yearly price is not available" | Web |
| Choose a plan anonymously | `apps/web/src/pages/public.test.tsx` "sends an anonymous visitor to the sign-up with the plan they chose" | Web |
| Choose a plan anonymously | `apps/web/src/pages/onboarding.test.tsx` "preselects the plan chosen in the pricing page" | Web |
| Footer links present | `apps/web/src/pages/public.test.tsx` "shows the header, the navigation and the legal links of the footer" | Web |
| Spanish title | `apps/web/src/pages/public.test.tsx` "shows the title of the page in Spanish" | Web |
| Automated accessibility check | `e2e/specs/accessibility.spec.ts` "has no accessibility violation on the landing page" | e2e |
| Automated accessibility check | `e2e/specs/accessibility.spec.ts` "has no accessibility violation on the pricing page" | e2e |

## quality-tooling

| Scenario | Test | Suite |
| --- | --- | --- |
| Clean template | `apps/api/tests/unit/tooling.spec.ts` "runs every check of every workspace from the root" | API |
| Lint failure | `apps/api/tests/unit/tooling.spec.ts` "fails the lint when a variable is not used" | API |
| Root test command | `apps/api/tests/unit/tooling.spec.ts` "runs every check of every workspace from the root" | API |
| E2E run | `apps/api/tests/unit/tooling.spec.ts` "keeps the trace of a failed journey" | API |
| Failing test blocks merge | `apps/api/tests/unit/tooling.spec.ts` "runs the tests and the journeys in the pipeline" | API |
| Installer regression | `apps/api/tests/unit/tooling.spec.ts` "checks the installer in the pipeline" | API |
| Installer regression | `packages/create-app/test/install.test.js` "no placeholder of the template survives in the project" | Installer |

## subscription-payments

| Scenario | Test | Suite |
| --- | --- | --- |
| Start checkout | `apps/api/tests/functional/billing.spec.ts` "answers with the URL of the payment provider" | API |
| Start checkout | `apps/api/tests/unit/creem_client.spec.ts` "creates a checkout with the product, the customer and the metadata" | API |
| Already subscribed | `apps/api/tests/functional/billing.spec.ts` "refuses a second checkout while the organization pays for a plan" | API |
| Invalid signature | `apps/api/tests/functional/billing_webhook.spec.ts` "refuses an event that is not signed" | API |
| Invalid signature | `apps/api/tests/functional/billing_webhook.spec.ts` "refuses an event without a signature" | API |
| Duplicate event | `apps/api/tests/functional/billing_webhook.spec.ts` "applies an event only once" | API |
| Subscription activated | `apps/api/tests/functional/billing_webhook.spec.ts` "activates the subscription of the organization" | API |
| Subscription activated | `apps/api/tests/functional/billing_webhook.spec.ts` "activates the subscription when the checkout is completed" | API |
| Out-of-order events | `apps/api/tests/functional/billing_webhook.spec.ts` "ignores an event that is older than the last one" | API |
| Return before webhook | `apps/web/src/pages/billing.test.tsx` "waits for the provider when the visitor comes back from the checkout" | Web |
| Payment failed | `apps/api/tests/functional/billing_webhook.spec.ts` "keeps the access during the grace period of a failed payment" | API |
| Payment failed | `apps/web/src/pages/billing.test.tsx` "warns the admins when the payment failed" | Web |
| Cancel at period end | `apps/api/tests/functional/billing_webhook.spec.ts` "keeps the subscription alive until the period ends" | API |
| Cancel at period end | `apps/api/tests/functional/billing.spec.ts` "cancels the subscription when the period ends" | API |
| Downgrade blocked by seats | `apps/api/tests/functional/billing.spec.ts` "refuses a downgrade that leaves members without a seat" | API |
| Open portal | `apps/api/tests/functional/billing.spec.ts` "answers with the link of the customer portal" | API |
| Open portal | `apps/web/src/pages/billing.test.tsx` "opens the customer portal of the organization" | Web |
| Simulated activation in e2e | `e2e/specs/billing.spec.ts` "activates the paid plan with a signed event of the provider" | e2e |

## transactional-email

| Scenario | Test | Suite |
| --- | --- | --- |
| Invitation email | `apps/api/tests/functional/mail.spec.ts` "the invitation carries the organization, the inviter and the accept link" | API |
| Provider error | `apps/api/tests/unit/mail_retry.spec.ts` "sends the message again when the provider fails" | API |
| Provider error | `apps/api/tests/unit/mail_retry.spec.ts` "gives up after three attempts" | API |
| Dev sign up | the run of the task 17.1: the verification email reaches the Mailpit inbox | Run |
| Dev sign up | `e2e/specs/auth.spec.ts` "signs up, verifies the address and signs in again" | e2e |
| Spanish password reset | `apps/api/tests/functional/mail.spec.ts` "the subject of every email follows the locale of the recipient" | API |
| Spanish password reset | `apps/api/tests/functional/mail.spec.ts` "the body of the email is written in the language of the recipient" | API |
| Images blocked | `apps/api/tests/functional/mail.spec.ts` "the email keeps the product name and the call to action without images" | API |
| Email provider slow | `apps/api/tests/functional/mail.spec.ts` "the sign up does not wait for the delivery of the email" | API |

## ui-components

| Scenario | Test | Suite |
| --- | --- | --- |
| Showcase lists every component | `apps/web/src/pages/showcase.test.tsx` "renders every component of the inventory" | Web |
| Server-side error mapping | `apps/web/src/components/patterns/form.test.tsx` "maps the errors of a 422 response to the matching fields" | Web |
| Shareable table state | `apps/web/src/components/patterns/data-table.test.tsx` "reads the sort, page and search from the URL" | Web |
| Empty results | `apps/web/src/components/patterns/data-table.test.tsx` "shows the empty state when there are no rows" | Web |
| Locale formatting | `apps/web/src/components/patterns/charts.test.tsx` "formats the axis numbers with the conventions of the locale" | Web |
| Rebrand | `apps/web/src/components/ui/tokens.test.tsx` "turns the tokens of the stylesheet into the colors of Tailwind" | Web |
| Rebrand | `apps/web/src/components/ui/tokens.test.tsx` "paints the buttons and the links with the primary token" | Web |
| Rebrand | `apps/web/src/components/ui/tokens.test.tsx` "paints the focus ring with the ring token" | Web |
| Rebrand | `apps/web/src/components/ui/tokens.test.tsx` "paints the charts with the chart tokens" | Web |
| Dialog focus | `apps/web/src/components/ui/dialog.test.tsx` "moves the focus into the dialog and traps it there" | Web |
| Dialog focus | `apps/web/src/components/ui/dialog.test.tsx` "closes on Escape and returns the focus to the trigger" | Web |
| Production build | `apps/web/src/pages/showcase.build.test.ts` "does not ship the showcase page in a production build" | Web |
| Production build | `apps/web/src/pages/showcase.build.test.ts` "does not reference the showcase route in a production build" | Web |

## user-auth

| Scenario | Test | Suite |
| --- | --- | --- |
| Successful sign up | `apps/api/tests/functional/auth.spec.ts` "creates the account, sends the verification email and signs the visitor in" | API |
| Successful sign up | `e2e/specs/auth.spec.ts` "signs up, verifies the address and signs in again" | e2e |
| Email already registered | `apps/api/tests/functional/auth.spec.ts` "rejects an email that already has an account" | API |
| Terms not accepted | `apps/api/tests/functional/auth.spec.ts` "rejects the sign up when the terms are not accepted" | API |
| Verify email | `apps/api/tests/functional/auth.spec.ts` "verifies the email with a valid link" | API |
| Verify email | the run of the task 17.1: the link of the mail marks the address as verified | Run |
| Expired link | `apps/api/tests/functional/auth.spec.ts` "refuses a link that has expired" | API |
| Unverified user attempts checkout | `apps/api/tests/functional/billing.spec.ts` "refuses the checkout when the email is not confirmed" | API |
| Valid credentials | `apps/api/tests/functional/auth.spec.ts` "signs a user in with the right credentials" | API |
| Invalid credentials | `apps/api/tests/functional/auth.spec.ts` "answers with the same error for a wrong password and an unknown email" | API |
| Invalid credentials | `e2e/specs/auth.spec.ts` "refuses a wrong password" | e2e |
| Logout | `apps/api/tests/functional/auth.spec.ts` "ends the session on logout" | API |
| Return to intended page | `apps/api/tests/functional/auth.spec.ts` "keeps a same-origin redirect and drops the foreign ones" | API |
| Return to intended page | `apps/web/src/components/auth/require-auth.test.tsx` "sends an anonymous visitor to the login page with the page they wanted" | Web |
| Request reset | `apps/api/tests/functional/auth.spec.ts` "answers the same way for an unknown email" | API |
| Reuse reset link | `apps/api/tests/functional/auth.spec.ts` "sends the reset link and accepts it only once" | API |
| Brute force login | `apps/api/tests/functional/auth.spec.ts` "blocks the login of an address after five failures" | API |
| Profile response | `apps/api/tests/functional/auth.spec.ts` "creates the account, sends the verification email and signs the visitor in" | API |

## user-profile

| Scenario | Test | Suite |
| --- | --- | --- |
| Update name | `apps/api/tests/functional/profile.spec.ts` "updates the name and the preferences of the user" | API |
| Update name | `apps/web/src/pages/profile.test.tsx` "saves the name of the visitor" | Web |
| Avatar upload limits | `apps/api/tests/functional/profile.spec.ts` "refuses an avatar that is not a PNG, a JPEG or a WebP" | API |
| Avatar upload limits | `apps/api/tests/functional/profile.spec.ts` "refuses an avatar bigger than 2 MB" | API |
| Avatar upload limits | `apps/web/src/pages/profile.test.tsx` "rejects an avatar that is not an accepted format" | Web |
| Pending email change | `apps/api/tests/functional/profile.spec.ts` "keeps the old address active until the link is opened" | API |
| Pending email change | `apps/web/src/pages/profile.test.tsx` "asks for the change of the email address" | Web |
| Wrong current password | `apps/api/tests/functional/profile.spec.ts` "refuses the change when the current password is not correct" | API |
| Wrong current password | `apps/web/src/pages/profile.test.tsx` "shows the error of a wrong current password" | Web |
| Switch to Spanish | `apps/web/src/pages/profile.test.tsx` "remembers the language of the visitor on the server" | Web |
| Switch to Spanish | `e2e/specs/preferences.spec.ts` "switches the language of the site" | e2e |
| Sole owner with members | `apps/api/tests/functional/profile.spec.ts` "refuses the deletion while the user is the only owner of an organization with members" | API |
| Sole owner with members | `apps/web/src/pages/profile.test.tsx` "refuses to delete the account of the only owner of an organization" | Web |
| Successful deletion | `apps/api/tests/functional/profile.spec.ts` "deletes the account, the memberships and the sessions" | API |

## The run of the task 17.1

The scenarios that need a whole product on a clean machine are proven by one
run of the installer against the template of the repository:

1. The installer writes a whole project in a new directory and rebrands it:
   the package, the Compose project, the database and the namespaces carry the
   name of the new product, and no name of the template survives.
2. The stack of the generated project answers: the API on `http://localhost:3333`,
   the web app on `http://localhost:5173` and the Mailpit inbox on
   `http://localhost:8025`.
3. The provider keys are empty and the AI provider is the stub.
4. A sign-up answers `201`, the verification email reaches the Mailpit inbox,
   its link marks the address as verified and the session carries the
   verification.
5. The repository of the generated project is clean: only the files of the
   template are committed and the `.env` files are ignored.
6. The end-to-end suite of the generated project passes against its own stack.

The run finished with zero failures: the installer ended with 0, the API and
the web app answered 200, the sign up answered 201, the mail reached the
Mailpit inbox, the address was verified, the repository of the generated
project was clean and the twelve journeys of its end-to-end suite passed.
