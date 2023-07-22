const PushAPI = require('@pushprotocol/restapi');

const axios = require('axios');

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

async function getWalletAddress(identity) {
  try {
    const apiUrl = 'https://api.airstack.xyz/gql';

    const query = `
      query MyQuery($identity: Identity!, $blockchain: TokenBlockchain!) {
        Wallet(input: { identity: $identity, blockchain: $blockchain }) {
          addresses
        }
      }
    `;

    // Set the variables for the query
    const variables = {
      identity: identity,
      blockchain: 'ethereum',
    };

    // Set the headers with the "Authorization" header
    const headers = {
      'Authorization': process.env.AIRSTACK_API_KEY,
    };

    // Send the POST request to the GraphQL API with headers
    const response = await axios.post(apiUrl, {
      query: query,
      variables: variables,
    }, {
      headers: headers,
    });

    // Extract the result from the response
    const result = response.data.data;

    if(result && result.Wallet && result.Wallet.addresses) {
      return result.Wallet.addresses[0]  
    } else {
      return null
    }
    
  } catch (error) {
    console.error('Error fetching data:', error.message);
    throw error;
  }
}

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

async function sendXMTP(from, to, msg) {
  
  try {
    const xmtp = await Client.create(from, { env: "production" });
    const conversation = await xmtp.conversations.newConversation(to);
    conversation.send(msg);
  } catch(e) {
    console.log('error in xmtp')
    return e.message
  }
  
}

async function sendPush(signer, to, msg) {
  let user 

  try {
    user = await PushAPI.user.create({
      signer: signer, 
      env: 'prod'
    })
  } catch(e) {
    user = await PushAPI.user.get({
      env: 'prod',
      account: signer.address // 0x7A33615d12A12f58b25c653dc5E44188D44f6898
    });
  }

  // console.log(user)

  // need to decrypt the encryptedPvtKey to pass in the api using helper function
  const pgpDecryptedPvtKey = await PushAPI.chat.decryptPGPKey({
    encryptedPGPPrivateKey: user.encryptedPrivateKey, 
    signer: signer
  });

  // console.log('eip155:' + to)

  // actual api
  const response = await PushAPI.chat.send({
    messageContent: msg,
    messageType: 'Text',
    receiverAddress: 'eip155:' + to,
    signer: signer,
    pgpPrivateKey: pgpDecryptedPvtKey
  });
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
function parseEthAddressFromString(inputString) {
  const ethAddressRegex = /(0x)?[0-9a-fA-F]{40}/;
  const match = inputString.match(ethAddressRegex);

  if (match) {
    return match[0];
  } else {
    return null; // or you can return an error message, throw an exception, etc.
  }
}

const isEthereumAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

function initBot() {
  const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;

  // Create a new bot instance
  const bot = new TelegramBot(botToken, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    const welcomeMessage = `Welcome to World Chat, @${username}! type an ens or Address + your msg, and we'll send it to them .`

    bot.sendMessage(chatId, welcomeMessage);
  });


  // Message handler
  bot.on('message', async (msg) => {  
    const chatId = msg.chat.id;

    try {  
      let messageText = msg.text ? msg.text.trim().toLowerCase() : ''; // Ensure messageText is not null
      const tg = msg.from.username
      const wallet = genWallet(tg);

      if (messageText === '/start') {
        // Handle the "/start" command separately if needed
        return; // Exit the callback early
      }

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
        console.log('\n\n\ncreated!!! new user\n\n ')
        await spinUpXmtp(tg)
        listenToXmtpMessages(tg)
      }

      const regex = /(0x[a-fA-F0-9]{40})|([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.eth)/g;


      const results = messageText.match(regex);
      console.log(results);
      if(!results) {
        bot.sendMessage(chatId, 'Please provide ENS or Address in your msg');
        return false;
      }

      let address = results[0]
      messageText = messageText.replace(address, '');

      if (!isEthereumAddress(address)) {
        console.log(`lookin up addr for ${address}`)
        address = await getWalletAddress(address)
        // no ENS found 
        if(!address) {  
          bot.sendMessage(chatId, 'Invalid ENS');
          return false;
        }
      }
      address = ethers.utils.getAddress(address)

      console.log(`
        chatId: ${chatId}
        tg: ${tg}
        Wallet: ${wallet.address}
        address: ${address}
        message: ${messageText}
      `)

      sendPush(wallet, address, messageText)
      var error = await sendXMTP(wallet, address, messageText)
      if(error){
        throw(error)
      }
      
    } catch(e ) {
      console.log(e)
      bot.sendMessage(chatId, e);
    }
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
  console.log(`listening to xmtp msgs for ${tg}...`)
  const chatId = await getChatIdByUsername(tg)
  const wallet = genWallet(tg);
  const xmtp = await Client.create(wallet, { env: "production" });

  for await (const message of await xmtp.conversations.streamAllMessages()) {
    if (message.senderAddress === xmtp.address) {
      // This message was sent from me
      continue;
    }

    console.log(`
      XTMP => 
      message.senderAddress: ${message.senderAddress}      
      xmtp.address : ${xmtp.address}
      message.content: ${message.content}
    `)


    const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;
    const bot = new TelegramBot(botToken, { polling: false });

    // console.log(`chatId: ${chatId}; msg: ${message.content}`)
    bot.sendMessage(chatId, message.content);

  }
}

async function main() { 
  await createTable();
  // Main process code
  console.log(`YOLO! Main process started.`);
  initBot();
  console.log('bot is live')

  const usernames = await getTelegramUsernames()

  for (var i = 0; i < usernames.length; i++) {
    listenToXmtpMessages(usernames[i])

  }
}

main();

async function sendAnnouncement(message) {
  const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;
  const bot = new TelegramBot(botToken, { polling: false });

  const usernames = await getTelegramUsernames();

  for (const username of usernames) {
    const chatId = await getChatIdByUsername(username);
    bot.sendMessage(chatId, message);
  }
}

// sendAnnouncement("this is @freeslugs; dinner is happening now! nom nom" )