const db = require('../database/db');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const modalSubmit = require('../interactions/modalSubmit');
const confirmarEscolha = require('../interactions/confirmarEscolha');
const sortear = require('../interactions/sorteio');
const acumular = require('../interactions/acumular');
const sortearEscolhidos = require('../interactions/sortearEscolhidos');
const sortearManual = require('../interactions/sortearManual');

module.exports = async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;

    // Abrir modal para escolher números
    if (customId.startsWith('open_modal_')) {
      return modalSubmit(interaction);
    }

    // Confirma ou recusa escolha de números
    if (customId.startsWith('confirmar_')) {
      return confirmarEscolha(interaction);
    }

    if (customId.startsWith('recusar_')) {
      await interaction.message.delete();
      return interaction.reply({ content: '❌ Escolha cancelada.', flags: 64 });
    }

    // Sortear número aleatório
    if (customId.startsWith('sorteio_iniciar_')) {
      return sortear(interaction);
    }

    // Acumular valor com número não escolhido
    if (customId.startsWith('acumular_iniciar_')) {
      return acumular(interaction);
    }

    // Sortear entre números escolhidos
    if (customId.startsWith('sortear_escolhidos_')) {
      return sortearEscolhidos(interaction);
    }

    // Abrir modal para sortear número específico
    if (customId.startsWith('sortear_manual_')) {
      return sortearManual(interaction);
    }

    // Confirmar sorteio de qualquer tipo
    if (customId.startsWith('confirmar_sorteio_')) {
      const [, , sorteioId, numeroStr] = customId.split('_');
      const numero = parseInt(numeroStr);
      const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);
      if (!sorteio) return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });

      const registros = db.prepare('SELECT user_id, numeros FROM entradas WHERE sorteio_id = ?').all(sorteioId);
      let ganhador = null;
      let premio = 0;

      for (const r of registros) {
        const numeros = r.numeros.split(',').map(n => parseInt(n.trim()));
        if (numeros.includes(numero)) {
          ganhador = r.user_id;
          premio = numeros.length * sorteio.valor_numero;
          break;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎯 Resultado Final — ${sorteio.nome}`)
        .setDescription(`Número sorteado: **${numero}**`)
        .setColor(ganhador ? 'Green' : 'Red')
        .setTimestamp();

      if (ganhador) {
        embed.addFields({ name: '🏆 Ganhador', value: `<@${ganhador}> — R$ ${premio.toLocaleString('pt-BR')}` });
      } else {
        embed.addFields(
          { name: '😢 Sem Ganhador', value: 'Ninguém escolheu esse número.' },
          { name: '📈 Prêmio Acumulado', value: 'O valor foi mantido para o próximo sorteio.' }
        );
      }

      const canal = await interaction.client.channels.fetch(sorteio.canal_resultado);
      await canal.send({ embeds: [embed] });

      return interaction.update({
        content: '✅ Resultado confirmado e publicado.',
        embeds: [],
        components: []
      });
    }

    // Cancelar sorteio
    if (customId === 'cancelar_sorteio') {
      return interaction.update({ content: '❌ Sorteio cancelado.', embeds: [], components: [] });
    }
  }

  if (interaction.isModalSubmit()) {
    const customId = interaction.customId;

    if (customId.startsWith('input_modal_')) {
      return modalSubmit(interaction);
    }

    if (customId === 'sortear_manual_modal') {
      const input = interaction.fields.getTextInputValue('numero_manual');
      const numero = parseInt(input.trim());
      const sorteioId = interaction.message.components[0]?.components[0]?.customId?.split('_')[2];

      if (isNaN(numero) || numero < 1 || numero > 100) {
        return interaction.reply({ content: '⚠️ Número inválido. Digite um número entre 1 e 100.', flags: 64 });
      }

      const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);
      if (!sorteio) return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });

      const registros = db.prepare('SELECT user_id, numeros FROM entradas WHERE sorteio_id = ?').all(sorteioId);
      let ganhador = null;
      let premio = 0;

      for (const r of registros) {
        const numeros = r.numeros.split(',').map(n => parseInt(n.trim()));
        if (numeros.includes(numero)) {
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
          { name: '📈 Prêmio Acumulado', value: 'O valor será mantido para o próximo sorteio.' }
        );
      }

      const embed = new EmbedBuilder()
        .setTitle(`📝 Confirmação de Sorteio Manual — ${sorteio.nome}`)
        .setDescription(`Número digitado: **${numero}**`)
        .addFields(fields)
        .setColor(ganhador ? 'Green' : 'Orange');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmar_sorteio_${sorteioId}_${numero}`)
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
    }
  }
};
