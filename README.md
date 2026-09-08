# Discord API Toolkit
A Discord bot providing API utilities, debugging tools, database utilities, encoding helpers, hashing tools, JWT decoding, JSON formatting, webhook utilities, and API request building.
## AI-Generated Software
This project was created with substantial assistance from AI tools.
Much of the source code was generated using Claude by Anthropic.
This repository does not claim sole human authorship of AI-generated portions.
See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for more information.
## Features
- API request tools
- API request builder
- API request execution
- Batch API requests
- Webhook utilities
- DNS debugging
- HTTP ping tools
- HTTP header inspection
- SSL debugging
- SQLite database utilities
- Base64 encoding and decoding
- Hash generation
- JWT decoding
- JSON formatting
## Requirements
- Bun 1.2+
- A Discord application and bot
- Discord bot token
- Discord application/client ID
## Installation
Clone the repository:
```bash
git clone https://github.com/carteraccs/api-bot.git
cd api-bot

Install dependencies:

bun install

Create your environment file:

cp .env.example .env

Edit .env and provide your Discord credentials.

Development

Run the bot in development mode:

bun run dev

Build

Build the TypeScript project:

bun run build

Production

Start the compiled bot:

bun run start

Docker

Build the image:

docker build -t discord-api-toolkit .

Run it:

docker run -d \
  --name discord-api-toolkit \
  --restart unless-stopped \
  --env-file .env \
  -v discord-api-toolkit-data:/app/data \
  discord-api-toolkit

The SQLite database is stored in /app/data/database.sqlite.

Coolify

The project can be deployed using Docker through Coolify.

Use the repository as the source and select Dockerfile-based deployment.

Configure the required environment variables through your deployment environment.

Persistent storage should be mounted to:

/app/data

Environment Variables

Variable	Required	Description
DISCORD_TOKEN	Yes	Discord bot token
CLIENT_ID	Yes	Discord application/client ID

Never commit .env or any Discord bot token to Git.

Security

If a Discord bot token is accidentally exposed, revoke and regenerate it immediately through the Discord Developer Portal.

Do not share bot tokens, API keys, database credentials, or other secrets publicly.

See SECURITY.md⁠ for security reporting information.

License

This project is released under the MIT License.

See LICENSE⁠ for the full license text.

Disclaimer

This project is provided as-is.

The maintainers are not responsible for damage, data loss, API abuse, account restrictions, service interruptions, or other consequences resulting from use of this software.

Users are responsible for complying with Discord’s Terms of Service, API policies, applicable laws, and the policies of any third-party APIs they access.

Contributing

Pull requests and improvements are welcome.

Before submitting changes, make sure the project builds successfully:

bun run build

Also review security implications and dependency licenses before submitting changes.
