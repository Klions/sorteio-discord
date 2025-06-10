const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = async (interaction) => {
  const [, , sorteioId] = interaction.customId.split('_');
  const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);

  if (!sorteio) {
    return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId(`sortear_manual_modal_${sorteioId}`)
    .setTitle(`📝 Sorteio Manual — ${sorteio.nome}`);

  const input = new TextInputBuilder()
    .setCustomId('numero_manual')
    .setLabel(`Número entre ${sorteio.faixa_min} e ${sorteio.faixa_max}`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
};
