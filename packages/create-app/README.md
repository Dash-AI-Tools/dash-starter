# create-dash-starter

Creates a new AI SaaS product from the [Dash Starter](https://github.com/Dash-AI-Tools/dash-starter) template.

```bash
npx create-dash-starter my-product
```

The installer downloads the release of the template that matches its own version, rebrands every placeholder, writes the `.env` files with fresh secrets, initializes git and — optionally — creates a private repository in GitHub and boots the stack.

## Flags

| Flag                | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `--name <name>`     | Product name, e.g. "Acme AI"                           |
| `--slug <slug>`     | Kebab-case slug, e.g. `acme-ai`                        |
| `--description <t>` | One-line description                                   |
| `--locale <en\|es>` | Default locale of the product                          |
| `--email <address>` | Support email                                          |
| `--template <path>` | Use a local directory instead of the published release |
| `--yes`             | Accept every default without prompting                 |
| `--no-install`      | Skip `npm install`                                     |
| `--no-boot`         | Skip `docker compose up`                               |
| `--no-git`          | Skip `git init`                                        |
| `--github`          | Create a private GitHub repository with `gh`           |

Every flag that carries an identity has a default, so `--yes` generates a project without a single question.

## The contract of the template

The installer reads `template.json`, the manifest of the template:

- `identity` — the questions and their defaults.
- `tokens` — the literals of the template and the value of the identity that replaces them.
- `files` and `exclude` — the files that travel and the ones that do not.
- `removePaths`, `removeSections` and `removeLines` — the parts of the template that a product does not need.
- `removeWorkflowJobs` — the jobs of the CI that only make sense in the template.

The installer and the template are released together: the version of the installer is the version of the template, and the installer downloads the release tagged `v<version>`.
