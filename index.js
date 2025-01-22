const { Client, GatewayIntentBits, PresenceUpdateStatus } = require('discord.js');
const express = require('express');
const axios = require('axios'); // Import axios to make HTTP requests

// --- Environment Variables ---
const BOT_TOKEN = process.env.BOT_TOKEN; // Your Discord bot token
const TARGET_CHANNEL_ID = '1331599991403315241'; // The target channel ID
const SOURCE_CHANNEL_ID = '1317506444412719204'; // The source channel ID

// --- Discord Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            // Enables access to guilds (servers)
    GatewayIntentBits.GuildMessages,    // Enables access to message events
    GatewayIntentBits.MessageContent,   // Enables access to read message content
  ],
});

// Store the mapping of forwarded messages (source message -> forwarded message ID)
const forwardedMessages = new Map();

// --- Helper Function: Remove footer from embed ---
function removeFooterFromEmbed(embed) {
  const clonedEmbed = embed.toJSON();
  if (clonedEmbed.footer) {
    delete clonedEmbed.footer;
  }
  return clonedEmbed;
}

// --- When the bot is ready ---
client.once('ready', async () => {
  console.log('✅ Logged in as:', client.user.tag);

  await client.user.setPresence({
    status: PresenceUpdateStatus.Invisible, // Invisible status
  });
  console.log('🔒 Bot is now set to invisible (offline).');
});

// --- Listen for messages in the source channel ---
client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return; // Only process messages from the source channel

  console.log(`🔄 Forwarding message from ${message.author.tag}: "${message.content}"`);

  try {
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!targetChannel) {
      console.error('❌ Could not find the target channel!');
      return;
    }

    // Prepare content to forward
    const forwardContent = {
      content: message.content || null,
      embeds: message.embeds.map((embed) => removeFooterFromEmbed(embed)),
    };

    // Send the message to the target channel and store the forwarded message ID
    const forwardedMessage = await targetChannel.send(forwardContent);
    forwardedMessages.set(message.id, forwardedMessage.id); // Map the source message ID to the forwarded message ID

    console.log(`✅ Message forwarded to target channel: "${message.content}"`);
  } catch (error) {
    console.error('❌ Error forwarding message:', error);
  }
});

// --- Listen for message edits in the source channel ---
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.channel.id !== SOURCE_CHANNEL_ID) return; // Only process edits in the source channel

  console.log(`🔄 Updating forwarded message: "${oldMessage.content}" → "${newMessage.content}"`);

  // Get the forwarded message ID from the map
  const forwardedMessageId = forwardedMessages.get(oldMessage.id);
  if (!forwardedMessageId) return;

  try {
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!targetChannel) {
      console.error('❌ Could not find the target channel!');
      return;
    }

    // Prepare updated content to forward
    const updatedContent = {
      content: newMessage.content || null,
      embeds: newMessage.embeds.map((embed) => removeFooterFromEmbed(embed)),
    };

    // Get the forwarded message and edit it
    const forwardedMessage = await targetChannel.messages.fetch(forwardedMessageId);
    if (forwardedMessage) {
      await forwardedMessage.edit(updatedContent); // Edit the message in the target channel
      console.log(`✅ Forwarded message updated: "${newMessage.content}"`);
    }
  } catch (error) {
    console.error('❌ Error updating forwarded message:', error);
  }
});

// --- Log in the bot ---
client.login(BOT_TOKEN).catch(console.error);

// --- Keep the Bot Alive ---
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

// Ping the bot every 15 seconds to keep it alive
setInterval(() => {
  axios.get('http://localhost:3000')
    .then(response => {
      console.log('🔄 Pinging bot...');
    })
    .catch(error => {
      console.error('❌ Error pinging bot:', error);
    });
}, 15000); // 15 seconds interval
