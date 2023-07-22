const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('@xmtp/xmtp-js');
const { ethers } = require('ethers');

dotenv.config();

const { Sequelize, DataTypes } = require('sequelize');

const connectionString = process.env.DATABASE_URL;
const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
});

const TelegramUser = sequelize.define('telegram_user', {
  username: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  chat_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  wallet_address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

async function createTable() {
  try {
    await sequelize.sync();
    console.log('Table "telegram_users" has been created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

async function getTelegramUsernames() {
  try {
    await sequelize.authenticate();
    const users = await TelegramUser.findAll({
      attributes: ['username'], 
    });

    // Extract the usernames from the users array and store them in a new array
    const usernames = users.map((user) => user.username);
    console.log('Usernames:', usernames);
    return usernames;
  } catch (error) {
    console.error('Error fetching usernames:', error);
  } 
}

function stringToHex(inputString) {
  const utf8Bytes = ethers.utils.toUtf8Bytes(inputString);
  const hexString = ethers.utils.hexlify(utf8Bytes);
  return hexString;
}

function genWallet(tg) {
  // Validate mnemonic and username
  const mnemonic = process.env.MNEMONIC;

  if (!mnemonic) {
    throw new Error("Invalid mnemonic.");
  }

  if (!tg || typeof tg !== 'string') {
    throw new Error("Invalid Telegram username.");
  }

  // Calculate the keccak256 hash of the combined seed
  const seedBytes = ethers.utils.toUtf8Bytes(mnemonic + tg);
  const keccakHash = ethers.utils.keccak256(seedBytes);

  const newWallet = new ethers.Wallet(keccakHash);

  return newWallet
}

async function sendXMTP(wallet, msg) {
  const xmtp = await Client.create(wallet, { env: "production" });
  const conversation = await xmtp.conversations.newConversation(
    // "0x7A33615d12A12f58b25c653dc5E44188D44f6898" // freeslugs
    '0x194c31cAe1418D5256E8c58e0d08Aee1046C6Ed0' // prod xmtp wallet 
  );

  // Send the goods to XMTP
  conversation.send(msg);
}


async function getChatIdByUsername(username) {
  try {
    // Connect to the database
    await sequelize.authenticate();

    // Find the user with the provided username
    const user = await TelegramUser.findOne({
      where: {
        username: username,
      },
    });

    // If the user exists, return the chat ID; otherwise, return null
    return user ? user.chat_id : null;
  } catch (error) {
    console.error('Error fetching chat ID from the database:', error);
    return null;
  } 
}

function initBot() {
  // Replace 'YOUR_TELEGRAM_API_TOKEN' with the token obtained from BotFather
  const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;

  // Create a new bot instance
  const bot = new TelegramBot(botToken, { polling: true });

  // Message handler
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text ? msg.text.trim().toLowerCase() : ''; // Ensure messageText is not null
    const tg = msg.from.username
    const wallet = genWallet(tg);

    // Find or create the user based on the chat ID
    const [user, created] = await TelegramUser.findOrCreate({
      where: {
        chat_id: chatId,
      },
      defaults: {
        username: tg,
        wallet_address: wallet.address
      },
    });

    if(created) {
      await spinUpXmtp(tg)
      listenToXmtpMessages(tg)
    }

    // const xmtpMsg = `@${tg}- ${messageText}`
    console.log(`chatId : ${chatId}, msg text:  ${messageText}, `)
    sendXMTP(wallet, messageText)
  });

  return bot
}



async function spinUpXmtp(tg) {
  console.log(`listening to XMTP messages for ${tg}`);
  // Your implementation to listen for XMTP messages goes here
  const wallet = genWallet(tg);
  console.log(`wallet: ${wallet.address}, ${wallet.privateKey}`)
  const xmtp = await Client.create(wallet, { env: "production" });
  return xmtp
}

async function listenToXmtpMessages(tg) {
  const chatId = await getChatIdByUsername(tg)
  const wallet = genWallet(tg);
  const xmtp = await Client.create(wallet, { env: "production" });

  for await (const message of await xmtp.conversations.streamAllMessages()) {
    if (message.senderAddress === xmtp.address) {
      // This message was sent from me
      continue;
    }
    console.log(`New message from ${message.senderAddress}: ${message.content}`);

    const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;
    const bot = new TelegramBot(botToken, { polling: true });

    console.log(`chatId: ${chatId}; msg: ${message.content}`)
    bot.sendMessage(chatId, message.content);

  }
}

async function main() { 
  await createTable();
  // Main process code
  console.log(`Main process started.`);
  initBot();
  console.log('bot is live')

  const usernames = await getTelegramUsernames()

  for (var i = 0; i < usernames.length; i++) {
    listenToXmtpMessages(usernames[i])

  }
}

main();