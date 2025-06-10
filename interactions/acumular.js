const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');

module.exports = async (interaction) => {
  const todosNumeros = Array.from({ length: 100 }, (_, i) => i + 1);
  const registros = db.prepare('SELECT user_id, numeros FROM entradas').all();
  const numerosEscolhidos = new Set();

  registros.forEach(r => {
    r.numeros.split(',').map(n => parseInt(n.trim())).forEach(n => numerosEscolhidos.add(n));
  });

  const numerosDisponiveis = todosNumeros.filter(n => !numerosEscolhidos.has(n));

  if (numerosDisponiveis.length === 0) {
    return interaction.reply({ content: '⚠️ Todos os números já foram escolhidos. Impossível acumular.', flags: 64 });
  }

  const numeroSorteado = numerosDisponiveis[Math.floor(Math.random() * numerosDisponiveis.length)];
  let ganhador = null;
  let premio = 0;

  for (const r of registros) {
    const numeros = r.numeros.split(',').map(n => parseInt(n.trim()));
    if (numeros.includes(numeroSorteado)) {
      ganhador = r.user_id;
      premio = numeros.length * 200;
      break;
    }
  }

  const fields = [];

  if (ganhador) {
    fields.push({ name: '🏆 Ganhador', value: `<@${ganhador}> — R$ ${premio.toLocaleString('pt-BR')}` });
  } else {
    fields.push(
      { name: '😢 Sem Ganhador', value: 'Ninguém escolheu esse número.' },
      { name: '📈 Prêmio Acumulado', value: 'O valor será mantido para o próximo sorteio.' }
    );
  }

  const embed = new EmbedBuilder()
    .setTitle('➕ Confirmação de Acúmulo')
    .setDescription(`Número aleatório disponível: **${numeroSorteado}**`)
    .addFields(fields)
    .setColor(ganhador ? 'Green' : 'Grey');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirmar_sorteio_${numeroSorteado}`)
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
