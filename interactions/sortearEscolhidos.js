const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');

module.exports = async (interaction) => {
  const [, , sorteioId] = interaction.customId.split('_');
  const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);
  if (!sorteio) return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });

  const registros = db.prepare('SELECT user_id, numeros FROM entradas WHERE sorteio_id = ?').all(sorteioId);
  const todosNumeros = [];

  for (const r of registros) {
    const nums = r.numeros.split(',').map(n => parseInt(n.trim()));
    todosNumeros.push(...nums);
  }

  const unicos = [...new Set(todosNumeros)];
  if (unicos.length === 0) {
    return interaction.reply({ content: '⚠️ Nenhum número foi escolhido ainda.', flags: 64 });
  }

  const numeroSorteado = unicos[Math.floor(Math.random() * unicos.length)];

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
    .setTitle(`🎲 Confirmação — Sortear (Escolhidos)`)
    .setDescription(`Número sorteado entre os já escolhidos: **${numeroSorteado}**`)
    .addFields(fields)
    .setColor(ganhador ? 'Green' : 'Orange');

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
    flags: 64
  });
};
