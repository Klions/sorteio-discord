const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { escolhasPendentes } = require('../util/store');

module.exports = async (interaction) => {
  const [acao, userId] = interaction.customId.split('_');
  if (interaction.user.id !== userId || acao !== 'confirmar') return;

  const escolha = escolhasPendentes.get(userId);
  if (!escolha) return interaction.reply({ content: '⚠️ Nenhuma escolha pendente encontrada.', flags: 64 });

  const { sorteioId, numeros } = escolha;
  const sorteio = db.prepare('SELECT * FROM sorteios WHERE id = ?').get(sorteioId);
  if (!sorteio) return interaction.reply({ content: '❌ Sorteio inválido.', flags: 64 });

  const qtd = numeros.length;
  const valor = qtd * sorteio.valor_numero;

  // Armazena entrada no banco
  db.prepare(`INSERT INTO entradas (sorteio_id, user_id, user_tag, numeros, data) VALUES (?, ?, ?, ?, ?);`)
    .run(sorteioId, interaction.user.id, interaction.user.tag, numeros.join(', '), new Date().toISOString());

  db.prepare(`UPDATE sorteios SET premio_total = premio_total + ? WHERE id = ?;`).run(valor, sorteioId);

  escolhasPendentes.delete(userId);

  // Atualiza mensagem principal
  const entradaMsg = db.prepare(`SELECT mensagem_id FROM mensagens_bot WHERE sorteio_id = ?`).get(sorteioId);
  if (entradaMsg) {
    const canal = await interaction.client.channels.fetch(sorteio.canal_entrada);
    const msg = await canal.messages.fetch(entradaMsg.mensagem_id).catch(() => null);
    const novoValor = db.prepare('SELECT premio_total FROM sorteios WHERE id = ?').get(sorteioId).premio_total;

    const embedAtualizado = new EmbedBuilder()
      .setTitle(`📋 ${sorteio.nome}`)
      .setDescription(`Escolha seus números entre **${sorteio.faixa_min} e ${sorteio.faixa_max}**\n💰 Cada número custa R$ ${sorteio.valor_numero}`)
      .addFields({ name: '🏆 Prêmio Atual', value: `R$ ${novoValor.toLocaleString('pt-BR')}` })
      .setColor('Green');

    const botao = new ButtonBuilder()
      .setCustomId(`open_modal_${sorteioId}`)
      .setLabel('🎟 Participar')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(botao);

    if (msg) {
      await msg.edit({ embeds: [embedAtualizado], components: [row] });
    }
  }

  // Atualiza canal de registros
  const canalReg = await interaction.client.channels.fetch(sorteio.canal_registro);
  const entradas = db.prepare('SELECT user_id, user_tag, numeros, data FROM entradas WHERE sorteio_id = ? ORDER BY id ASC').all(sorteioId);

  let totalGeral = 0;
  const corpo = entradas.map(r => {
    const nums = r.numeros.split(',').map(n => n.trim());
    const valor = nums.length * sorteio.valor_numero;
    totalGeral += valor;
    const timestamp = Math.floor(new Date(r.data).getTime() / 1000);
    return `• <@${r.user_id}> → **${nums.join(', ')}** → R$ ${valor.toLocaleString('pt-BR')} — <t:${timestamp}:R>`;
  }).join('\n');

  const embedRegistros = new EmbedBuilder()
    .setTitle(`📊 Entradas — ${sorteio.nome}`)
    .setDescription(corpo || 'Nenhum número registrado ainda.')
    .addFields({ name: '💰 Total de Entradas', value: `R$ ${totalGeral.toLocaleString('pt-BR')}` })
    .setColor('Blue');

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sorteio_iniciar_${sorteioId}`).setLabel('🎯 Sortear').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`acumular_iniciar_${sorteioId}`).setLabel('➕ Acumular Valor').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sortear_escolhidos_${sorteioId}`).setLabel('🎲 Sortear (Escolhidos)').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sortear_manual_${sorteioId}`).setLabel('📝 Sortear Específico').setStyle(ButtonStyle.Secondary)
  );

  const rowMsg = db.prepare('SELECT mensagem_id FROM mensagens_registro WHERE sorteio_id = ?').get(sorteioId);
  if (rowMsg) {
    const msg = await canalReg.messages.fetch(rowMsg.mensagem_id).catch(() => null);
    if (msg) await msg.edit({ embeds: [embedRegistros], components: [botoes] });
    else {
      const nova = await canalReg.send({ embeds: [embedRegistros], components: [botoes] });
      db.prepare(`INSERT OR REPLACE INTO mensagens_registro (sorteio_id, mensagem_id) VALUES (?, ?);`).run(sorteioId, nova.id);
    }
  } else {
    const nova = await canalReg.send({ embeds: [embedRegistros], components: [botoes] });
    db.prepare(`INSERT INTO mensagens_registro (sorteio_id, mensagem_id) VALUES (?, ?);`).run(sorteioId, nova.id);
  }

  // Confirmação final para o usuário
  const embed = new EmbedBuilder()
    .setTitle(`🎟 Registro Confirmado — ${sorteio.nome}`)
    .setDescription(`Números confirmados: **${numeros.join(', ')}**\n💰 Total pago: R$ ${valor.toLocaleString('pt-BR')}`)
    .setColor('Green');

  await interaction.reply({ embeds: [embed], flags: 64 });
};
