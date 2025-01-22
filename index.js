const { Client, GatewayIntentBits, PresenceUpdateStatus } = require('discord.js');
// --- Environment Variables ---
const BOT_TOKEN = process.env.BOT_TOKEN; // Your Discord bot token
const TARGET_CHANNEL_ID = '1331611315453562910'; // The target channel ID
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
      embeds: message.embeds.map((embed) => {
        const updatedEmbed = removeFooterFromEmbed(embed);
        
        // Forwarding images and other attachments explicitly
        if (embed.image) {
          updatedEmbed.image = embed.image;
        }
        if (embed.thumbnail) {
          updatedEmbed.thumbnail = embed.thumbnail;
        }

        return updatedEmbed;
      }),
      files: message.attachments.size > 0 ? [...message.attachments.values()] : [], // Forward file attachments
    };

    // Send the message to the target channel and store the forwarded message ID
    const forwardedMessage = await targetChannel.send(forwardContent);
    forwardedMessages.set(message.id, forwardedMessage.id); // Map the source message ID to the forwarded message ID

    console.log(`✅ Message forwarded to target channel: "${message.content}"`);
  } catch (error) {
    console.error('❌ Error forwarding message:', error);
  }
});

// --- Listen for message edits across the entire server ---
client.on('messageUpdate', async (oldMessage, newMessage) => {
  // Ensure we're handling only the messages from the source channel or messages that have been forwarded
  if (!oldMessage || !newMessage || newMessage.content === oldMessage.content) return; // Skip if content didn't change

  console.log(`🔄 Updating forwarded message: "${oldMessage.content}" → "${newMessage.content}"`);

  try {
    const forwardedMessageId = forwardedMessages.get(oldMessage.id);

    // If this message was forwarded, update it
    if (forwardedMessageId) {
      const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
      if (!targetChannel) {
        console.error('❌ Could not find the target channel!');
        return;
      }

      // Prepare updated content to forward
      const updatedContent = {
        content: newMessage.content || null,
        embeds: newMessage.embeds.map((embed) => {
          const updatedEmbed = removeFooterFromEmbed(embed);

          // Forwarding images and other attachments explicitly
          if (embed.image) {
            updatedEmbed.image = embed.image;
          }
          if (embed.thumbnail) {
            updatedEmbed.thumbnail = embed.thumbnail;
          }

          return updatedEmbed;
        }),
        files: newMessage.attachments.size > 0 ? [...newMessage.attachments.values()] : [], // Forward file attachments
      };

      // Get the forwarded message and edit it
      const forwardedMessage = await targetChannel.messages.fetch(forwardedMessageId);
      if (forwardedMessage) {
        await forwardedMessage.edit(updatedContent); // Edit the message in the target channel
        console.log(`✅ Forwarded message updated: "${newMessage.content}"`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating forwarded message:', error);
  }
});

// --- Log in the bot ---
client.login(BOT_TOKEN).catch(console.error);
