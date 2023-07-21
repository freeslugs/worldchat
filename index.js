const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('@xmtp/xmtp-js');
const { ethers } = require('ethers');

dotenv.config();

// Function to get the wallet from the mnemonic
function getWalletFromMnemonic() {
  const mnemonic = process.env.MNEMONIC;
  
  if (!mnemonic) {
    console.error("Mnemonic not found in .env file.");
    return null;
  }
  
  // Create a wallet using the mnemonic
  const wallet = ethers.Wallet.fromPhrase(mnemonic);

  return wallet;
}

const goodsList = [
  "toothpaste",
  "toothbrush",
  "tic tacs",
  "hollywood gum",
  "deodorant",
  "carambar",
  "potato chips",
  "xmtp swag",
  "red bull"
];

function initBot() {
  // Replace 'YOUR_TELEGRAM_API_TOKEN' with the token obtained from BotFather
  const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;

  // Create a new bot instance
  const bot = new TelegramBot(botToken, { polling: true });

  // Message handler
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text.trim().toLowerCase();

    if (messageText === "") {
      // If the user doesn't specify what goods they want, show them the list and ask to pick
      const goodsMessage = "Available goods:\n\n" + goodsList.join("\n");
      bot.sendMessage(chatId, goodsMessage);
    } else {
      // If the user provided a specific item from the list, send it to XMTP
      if (goodsList.includes(messageText)) {
        // Create a wallet to send the goods to XMTP
        const wallet = getWalletFromMnemonic();
        const xmtp = await Client.create(wallet, { env: "production" });
        const conversation = await xmtp.conversations.newConversation(
          "0x7A33615d12A12f58b25c653dc5E44188D44f6898"
        );

        const xmtpMsg = `@${msg.from.username} asked - ${messageText}`

        // Send the goods to XMTP
        conversation.send(xmtpMsg);

        bot.sendMessage(chatId, 'Dope, I notified the XMTP team');

      } else {
        // Respond with the list and ask to pick if the user provided an unknown item
        const goodsMessage = "What do you want? Here's what we have in stock:\n\n" + goodsList.join("\n");
        bot.sendMessage(chatId, goodsMessage);
      }
    }
  });
}

async function main() { 
  const wallet = getWalletFromMnemonic();
  const xmtp = await Client.create(wallet, { env: "production" });

  initBot();
}

main();


// const dotenv = require('dotenv');

// const TelegramBot = require('node-telegram-bot-api');

// const { Client } = require('@xmtp/xmtp-js');
// const { ethers } = require('ethers');

// dotenv.config();

// // Function to get the wallet from the mnemonic
// function getWalletFromMnemonic() {
//   const mnemonic = process.env.MNEMONIC;
  
//   if (!mnemonic) {
//     console.error("Mnemonic not found in .env file.");
//     return null;
//   }
  
//   // Create a wallet using the mnemonic
//   const wallet = ethers.Wallet.fromPhrase(mnemonic);

//   return wallet;
// }

// function initBot() {

//   // Replace 'YOUR_TELEGRAM_API_TOKEN' with the token obtained from BotFather
//   const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;

//   // Create a new bot instance
//   const bot = new TelegramBot(botToken, { polling: true });

//   // Command handler for /start command
//   bot.onText(/\/start/, (msg) => {
//     const chatId = msg.chat.id;
//     const message = 'Hello! I am your Telegram bot. Type /help for a list of available commands.';
//     bot.sendMessage(chatId, message);
//   });

//   // Command handler for /help command
//   bot.onText(/\/help/, (msg) => {
//     const chatId = msg.chat.id;
//     const message = 'List of available commands:\n\n/start - Start the bot\n/help - Show this help message';
//     bot.sendMessage(chatId, message);
//   });

//   // Message handler
//   bot.on('message', (msg) => {
//     console.log(msg)
//     const chatId = msg.chat.id;
//     const message = 'Sorry, I don\'t understand that command. Type /help for a list of available commands.';
//     bot.sendMessage(chatId, message);
//   });

// }

// async function main() { 
//   const wallet = getWalletFromMnemonic();
//   const xmtp = await Client.create(wallet, { env: "production" });
//   // Start a conversation with XMTP
//   const conversation = await xmtp.conversations.newConversation(
//     // "0x194c31cAe1418D5256E8c58e0d08Aee1046C6Ed0",
//     "0x7A33615d12A12f58b25c653dc5E44188D44f6898"
//   );

//   initBot()

//   // Listen for new messages in the conversation
//   for await (const message of await conversation.streamMessages()) {
//     // console.log(`[${message.senderAddress}]: ${message.content}`);
//     await conversation.send("hey baby u up");
//   }
// }

// main()