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
    return result.Wallet.addresses[0]
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

async function listenToPush(tg) {
  try {
    const signer = genWallet(tg);
    const chatId = await getChatIdByUsername(tg)
    const wallet = genWallet(tg);

    const to = '0x7A33615d12A12f58b25c653dc5E44188D44f6898'
    
    let user 

    try {
      user = await PushAPI.user.create({
        signer: signer, 
        env: 'prod'
      })
    } catch(e) {
      user = await PushAPI.user.get({
        env: 'prod',
        account: signer.address 
      });
    }

    const pgpDecryptedPvtKey = await PushAPI.chat.decryptPGPKey({
      encryptedPGPPrivateKey: user.encryptedPrivateKey, 
      signer: signer
    });

    const conversationHash = await PushAPI.chat.conversationHash({
      account: 'eip155:' + signer.address,
      conversationId: 'eip155:' + to
    });
      
    const chatHistory = await PushAPI.chat.history({
      threadhash: conversationHash.threadHash,
      account: 'eip155:' + signer.address,
      limit: 10,
      toDecrypt: true,
      pgpPrivateKey: pgpDecryptedPvtKey
    });

    // Get the current time in milliseconds
    const currentTime = Date.now();

    // Iterate through each object in the list
    for (const obj of chatHistory) {
      // Convert timestamp to milliseconds
      const timestamp = obj.timestamp;

      // Check if the timestamp is within the past 1 minutes
      if (currentTime - timestamp <= 1 * 60 * 1000) {
        // Extract the ETH addresses from fromDID and toDID
        const fromEthAddress = obj.fromDID.split(':').pop();
        const toEthAddress = obj.toDID.split(':').pop();

        bot.sendMessage(chatId, obj.messageContent);
      }
    }
  } catch(e) {
    console.log('error in listen')
    console.log(e)
  }
 
}

async function main() {
  try {
    const botToken = process.env.YOUR_TELEGRAM_API_TOKEN;

    // Create a new bot instance
    const bot = new TelegramBot(botToken, { polling: false });

    const usernames = await getTelegramUsernames()

    for (var i = 0; i < usernames.length; i++) {
      listenToPush(usernames[i])
    }
  
  } catch(e) {
    console.log('error in main')
    console.log(e)
  }
  

}

main();