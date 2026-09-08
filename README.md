# Mrs Claudia

A Discord bot providing API utilities, debugging tools, database utilities, encoding helpers, hashing tools, JWT decoding, JSON formatting, webhook utilities, and API request building.

## AI-Generated Software

This project was created with substantial assistance from AI tools.

Much of the source code was generated using Claude by Anthropic. This repository does not claim sole human authorship of AI-generated portions.

See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for more information.

## Features

- API request tools
- API request builder
- API request execution
- Batch API requests
- Webhook utilities
- DNS debugging
- Database utilities
- JSON formatting
- Base64 encoding and decoding
- SHA-256 hashing
- UUID generation
- JWT decoding
- Discord utilities
- SQLite database
- Environment-based configuration

## Requirements

- [Bun](https://bun.sh/) 1.2+
- Git
- A Discord application
- A Discord bot token

Node.js is not required when running the project with Bun.

## Installation

Clone the repository:

```bash
git clone https://github.com/carteraccs/mrs-claudia.git
cd mrs-claudia
```

Install dependencies:

```bash
bun install
```

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
```

**Never commit `.env` or expose your Discord bot token.**

If your token has ever been exposed publicly, revoke it through the Discord Developer Portal and generate a new one.

## Development

Start the bot in development mode:

```bash
bun run dev
```

## Build

Compile the TypeScript source:

```bash
bun run build
```

The compiled output is written to:

```text
dist/
```

## Production

Start the compiled application:

```bash
bun run start
```

## Database

The project uses SQLite.

The database file is:

```text
database.sqlite
```

The database is created automatically when the application starts.

For Docker deployments, the database should be persisted using `/app/data`.

## Docker

The repository includes a Bun-based Dockerfile.

### Build

```bash
docker build -t mrs-claudia .
```

### Run

```bash
docker run -d \\
  --name mrs-claudia \\
  --restart unless-stopped \\
  --env-file .env \\
  -v mrs-claudia-data:/app/data \\
  mrs-claudia
```

The SQLite database is stored inside the container at:

```text
/app/data/database.sqlite
```

Persist `/app/data` so the database survives container recreation.

### View Logs

```bash
docker logs -f mrs-claudia
```

### Stop

```bash
docker stop mrs-claudia
```

### Restart

```bash
docker restart mrs-claudia
```

### Remove

```bash
docker rm -f mrs-claudia
```

## Coolify

Mrs. Claudia can be deployed through Coolify using the included Dockerfile.

### Repository

Use:

```text
https://github.com/carteraccs/mrs-claudia.git
```

Select **Dockerfile** as the deployment method.

### Environment Variables

Add the following environment variables in Coolify:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
```

### Persistent Storage

Create a persistent volume mounted to:

```text
/app/data
```

This keeps the SQLite database between deployments.

After configuring the application, deploy it through Coolify and check the application logs to verify that the bot connects successfully.

## Project Structure

```text
.
├── src/
│   ├── commands/
│   ├── database/
│   ├── utils/
│   └── index.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── AI_DISCLOSURE.md
├── Dockerfile
├── LICENSE
├── package.json
├── schema.sql
├── tsconfig.json
└── README.md
```

## Scripts

| Command | Description |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Start development mode |
| `bun run build` | Compile TypeScript |
| `bun run start` | Start production build |

## Security

Please report security vulnerabilities responsibly.

See [SECURITY.md](SECURITY.md) for the security policy.

Never publish:

- Discord bot tokens
- API keys
- Database credentials
- `.env` files
- Private deployment credentials

## License

This project is licensed under the MIT License.

See [LICENSE](LICENSE) for the full license text.

## AI Disclosure

This project was developed with substantial assistance from AI tools, including Claude by Anthropic.

See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for additional information.
