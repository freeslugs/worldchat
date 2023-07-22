# World Chat - Telegram Messaging Bot

World Chat is an evolved version of XMTPizza, a Telegram bot that enables users to send and receive messages using both the XMTP and Push protocols. This project started as XMTPizza, a bot specifically designed to communicate with the XMTP team through XMTP messages. Over time, it evolved into World Chat, offering a broader feature set and capabilities to facilitate seamless messaging between users on various platforms.

## Features
- Send and receive messages using both XMTP and Push protocols.
- Interact with the XMTP team through the bot (formerly XMTPizza).
- Sign up and use the bot to request snack deliveries, like tic tacs (formerly XMTPizza feature).

## Getting Started
To get started with World Chat, follow these steps:

1. Clone this repository to your local machine.
2. Install the required dependencies using npm install.
3. Obtain a Telegram API token and a Push API key. Set these tokens as environment variables in a .env file.
4. Set up a PostgreSQL database and provide the database URL as an environment variable in the .env file.
5. Run the bot using node index.js.
6. Ensure that your environment is set up correctly with the necessary API tokens and database credentials for the bot to function correctly.

## Usage
Once the bot is up and running, start a conversation with it on Telegram. World Chat will guide you on how to send and receive messages. You can interact with other users who are using the bot and communicate with them through both XMTP and Push protocols.

### XMTPizza 
The original version of the bot, XMTPizza, specifically communicated with the XMTP team through the XMTP protocol. It allowed nearly 40 participants during the hackathon to send messages to the team, including snack delivery requests like tic tacs. The XMTPizza feature remains active and functional within World Chat.

## Contributing
Contributions to World Chat are welcome! If you wish to contribute, please follow the guidelines in the CONTRIBUTING.md file. You can contribute by opening issues, submitting bug fixes, proposing new features, or making improvements to the existing codebase.

### License
World Chat is an open-source project, licensed under the MIT License. Feel free to use, modify, and distribute the code as per the terms of the license.

### Acknowledgments
We would like to express our gratitude to all the contributors and users who have supported XMTPizza and World Chat throughout their development and use. Your feedback and involvement have been invaluable in making these projects successful.

Thank you for using World Chat! Enjoy messaging across platforms and have a great time interacting with others through XMTP and Push protocols. Happy chatting! 🌍



## Visit IRL 

**@xmtpizza_bot**

**@web3_world_bot**




README.md
```
fly deploy . -a xmtpizza
```

```
flyctl scale count 1 -a xmtpizza
```

```
flyctl scale count 0 -a xmtpizza
```

https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/FederatedAttestations.sol

https://xmtp.org/blog/attachments-and-remote-attachments


// save users to db 
// lkistener script pull from db 

// find wallet for it! 
// and send it back!! 
// add a child progress

// world coin 