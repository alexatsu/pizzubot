## Features

- Logging
    - messages
    - bans/kicks/disconnects
    - voice (join/leave/screen share)
- Moderation
    - auto role assign
    - auto cleanup user from db when left
- Room Handling
    - auto voice creation/deletion
    - ping current voice
- AI companion (friendly/angry versions)
    - different voices/roles
    - prefix slash commands with "/" to see all commands
- Economy
    - wallet (check balance)
    - shop (buy/swap roles)
    - coins generation (text message/voice activity)

## How to setup for development
- install nodejs
- install pnpm
- (optional) install docker
- create `.env` file with your data. Reference ci folder.
- pnpm install
- pnpm start