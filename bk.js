const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('@xmtp/xmtp-js');
const { ethers } = require('ethers');

dotenv.config();

const usernames = [
  'freeslugs'
]


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
    "0x7A33615d12A12f58b25c653dc5E44188D44f6898"
  );

  // Send the goods to XMTP
  conversation.send(msg);
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
    const tg = msg.from.username

    if (messageText === "") {
      // If the user doesn't specify what goods they want, show them the list and ask to pick
      const goodsMessage = "Available goods:\n\n" + goodsList.join("\n");
      bot.sendMessage(chatId, goodsMessage);
    } else {
      // If the user provided a specific item from the list, send it to XMTP
      if (goodsList.includes(messageText)) {
        // Create a wallet to send the goods to XMTP
        const wallet = genWallet(tg);
        const xmtpMsg = `@${tg} asked - ${messageText}`
        sendXMTP(wallet, xmtpMsg)

        bot.sendMessage(chatId, 'Dope, I notified the XMTP team');

      } else {
        // Respond with the list and ask to pick if the user provided an unknown item
        const goodsMessage = "What do you want? Here's what we have in stock:\n\n" + goodsList.join("\n");
        bot.sendMessage(chatId, goodsMessage);
      }
    }
  });
}


// Function to run the specified function with provided parameters in each child process
function runFunctionInChild(functionName, ...params) {
  // Replace this with your actual functions to execute based on the functionName parameter
  if (functionName === 'listenToXmtpMessages') {
    listenToXmtpMessages(...params);
  } else {
    console.error('Unknown function name:', functionName);
  }
}

// Replace this with the actual implementation of the method you want to run in each child process
async function listenToXmtpMessages(tg) {
  console.log(`Child process ${process.env.THREAD_INDEX} listening to XMTP messages for ${tg}`);
  // Your implementation to listen for XMTP messages goes here
  const wallet = genWallet(tg);
  const xmtp = await Client.create(wallet, { env: "production" });

  for await (const message of await xmtp.conversations.streamAllMessages()) {
    if (message.senderAddress === xmtp.address) {
      // This message was sent from me
      continue;
    }
    console.log(`New message from ${message.senderAddress}: ${message.content}`);

    // find wallet for it! 
    // and send it back!! 
    const myWallet = usernames.map(u => genWallet(u)).filter(u => u.address == message.senderAddress)[0]
    bot.sendMessage(chatId, 'Dope, I notified the XMTP team');
  }
}

const { fork } = require('child_process');

// const NUM_PROCESSES = 4; // Number of child processes to spawn

// Array to store references to child processes
let childProcesses = [];

// Function to gracefully terminate all child processes
const shutdownChildProcesses = () => {
  for (const childProcess of childProcesses) {
    childProcess.send('shutdown');
  }
};

// Register the shutdown event listener
process.on('SIGINT', () => {
  console.log('Shutting down the application gracefully...');
  shutdownChildProcesses();
});

// Function to create a new child process
const createChildProcess = (processIndex, functionName, params) => {
  const child = fork(__filename, [functionName, ...params], {
    env: { THREAD_INDEX: processIndex },
  });

  child.on('message', (message) => {
    if (message === 'shutdown') {
      console.log(`Child process ${processIndex} shutting down...`);
      process.exit(0);
    }
  });

  childProcesses.push(child);
};


async function main() { 
  // Main process code
  if (!process.env.THREAD_INDEX) {
    // This block will be executed only in the main process
    console.log(`Main process started.`);
    initBot();
    console.log('bot is live')


    for (var i = 0; i < usernames.length; i++) {
      const functionName = 'listenToXmtpMessages';
      const params = [usernames[i]];
      createChildProcess(i, functionName, params);

    }
  } else {
    // Child process code
    const functionName = process.argv[2];
    const params = process.argv.slice(3);

    console.log(`
      functionName: ${functionName}
      params: ${params}
      `)
    runFunctionInChild(functionName, ...params);
  }
}

main();


// find wallet for it! 
// and send it back!! 
usernames.map(u => genWallet(u)).filter(u => u.address == message.senderAddress)[0]
let myUsername;
for (var i = 0; i < usernames.length; i++) {
  let username = usernames[i]
  console.log('searching...')
  console.log(username)
  const myWallet = genWallet(username)
  if(myWallet.address == message.senderAddress) {
    console.log(`found me = wallet: ${myWallet}; username ; ${username}`)
    myUsername = username
    break;
  }
}
console.log('foudn me ' + myUsername)



if (messageText === "") {
  // If the user doesn't specify what goods they want, show them the list and ask to pick
  const goodsMessage = "Available goods:\n\n" + goodsList.join("\n");
  bot.sendMessage(chatId, goodsMessage);
} else {
  // If the user provided a specific item from the list, send it to XMTP
  if (goodsList.includes(messageText)) {
    // Create a wallet to send the goods to XMTP
    const wallet = genWallet(tg);
    const xmtpMsg = `@${tg} asked - ${messageText}`
    sendXMTP(wallet, xmtpMsg)

    bot.sendMessage(chatId, 'Dope, I notified the XMTP team');

  } else {
    // Respond with the list and ask to pick if the user provided an unknown item
    const goodsMessage = "What do you want? Here's what we have in stock:\n\n" + goodsList.join("\n");
    bot.sendMessage(chatId, goodsMessage);
  }
}