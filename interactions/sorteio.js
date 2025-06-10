const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');

module.exports = async (interaction) => {
  const [_, __, sorteioId] = interaction.customId.split('_');
  const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);
  if (!sorteio) return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });

  const { faixa_min, faixa_max } = sorteio;
  const numeroSorteado = Math.floor(Math.random() * (faixa_max - faixa_min + 1)) + faixa_min;

  const registros = db.prepare('SELECT user_id, numeros FROM entradas WHERE sorteio_id = ?').all(sorteioId);
  let ganhador = null;
  let premio = 0;

  for (const r of registros) {
    const numeros = r.numeros.split(',').map(n => parseInt(n.trim()));
    if (numeros.includes(numeroSorteado)) {
      ganhador = r.user_id;
      premio = numeros.length * sorteio.valor_numero;
      break;
    }
  }

  const fields = [];

  if (ganhador) {
    fields.push({ name: '🏆 Ganhador', value: `<@${ganhador}> — R$ ${premio.toLocaleString('pt-BR')}` });
  } else {
    fields.push(
      { name: '😢 Sem Ganhador', value: 'Ninguém escolheu esse número.' },
      { name: '📈 Prêmio Acumulado', value: 'O valor foi mantido para o próximo sorteio.' }
    );
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎯 Confirmação de Sorteio — ${sorteio.nome}`)
    .setDescription(`Número sorteado aleatoriamente: **${numeroSorteado}**`)
    .addFields(fields)
    .setColor(ganhador ? 'Green' : 'Red');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirmar_sorteio_${sorteioId}_${numeroSorteado}`)
      .setLabel('✅ Confirmar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancelar_sorteio')
      .setLabel('❌ Cancelar')
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
    flags: 64 // ephemeral
  });
};
