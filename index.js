require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Carrega configurações
const config = require('./config');

// Banco de dados
const db = require('./database/db');

// Mapa para armazenar escolhas pendentes
const { escolhasPendentes } = require('./util/store');

// Evento: onReady
client.once(Events.ClientReady, async () => {
  const readyHandler = require('./events/ready');
  await readyHandler(client);
});

// Evento: onInteractionCreate
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    const handler = require('./events/interaction');
    await handler(interaction);
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Erro ao processar.', flags: 64 });
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro.', flags: 64 });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
