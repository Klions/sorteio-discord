const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../database/db');
const { escolhasPendentes } = require('../util/store');

module.exports = async (interaction) => {
  const [prefixo, _, sorteioId] = interaction.customId.split('_');
  const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);
  if (!sorteio) return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });

  if (interaction.isModalSubmit()) {
    const rawInput = interaction.fields.getTextInputValue('user_input');

    const numerosDigitados = [...new Set(
      rawInput
        .split(',')
        .map(v => v.trim())
        .filter(v => /^\d+$/.test(v))
        .map(Number)
        .filter(n => n >= sorteio.faixa_min && n <= sorteio.faixa_max)
    )].sort((a, b) => a - b);

    if (numerosDigitados.length === 0) {
      return await interaction.reply({
        content: '⚠️ Nenhum número válido foi encontrado.',
        flags: 64
      });
    }

    const registros = db.prepare('SELECT numeros FROM entradas WHERE sorteio_id = ?').all(sorteioId);
    const numerosOcupados = new Set();
    registros.forEach(r => {
      r.numeros.split(',').map(n => parseInt(n.trim())).forEach(n => numerosOcupados.add(n));
    });

    const numerosDisponiveis = numerosDigitados.filter(n => !numerosOcupados.has(n));
    const numerosRepetidos = numerosDigitados.filter(n => numerosOcupados.has(n));
    const custoTotal = numerosDisponiveis.length * sorteio.valor_numero;

    if (numerosDisponiveis.length === 0) {
      return interaction.reply({ content: '❌ Todos os números já foram escolhidos.', flags: 64 });
    }

    escolhasPendentes.set(interaction.user.id, {
      sorteioId,
      numeros: numerosDisponiveis
    });

    let descricao = `Você escolheu **${numerosDisponiveis.length} número(s)**: **${numerosDisponiveis.join(', ')}**`;
    descricao += `\n💰 Total: **R$ ${custoTotal.toLocaleString('pt-BR')}**`;

    if (numerosRepetidos.length > 0) {
      descricao += `\n⚠️ Os números **${numerosRepetidos.join(', ')}** já foram escolhidos e foram ignorados.`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Confirmação — ${sorteio.nome}`)
      .setDescription(descricao)
      .setColor('Blue');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirmar_${interaction.user.id}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('❌ Recuar').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({
      content: `🔎 <@${interaction.user.id}>, confirme sua escolha para **${sorteio.nome}**:`,
      embeds: [embed],
      components: [row],
      flags: 0
    });

    setTimeout(() => msg.delete().catch(() => {}), 30_000);
  } else {
    const modal = new ModalBuilder()
      .setCustomId(`input_modal_${sorteioId}`)
      .setTitle(`🎟 ${sorteio.nome} — Digite seus números`);

    const input = new TextInputBuilder()
      .setCustomId('user_input')
      .setLabel(`Ex: ${sorteio.faixa_min}, ${sorteio.faixa_min + 1}, ...`)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return await interaction.showModal(modal);
  }
};
