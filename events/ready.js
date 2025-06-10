const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const db = require('../database/db');
const config = require('../config');

module.exports = async (client) => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  for (const sorteio of config.sorteios) {
    const canal = await client.channels.fetch(sorteio.canais.entrada).catch(() => null);

    if (!canal || canal.type !== ChannelType.GuildText) {
      console.error(`❌ Canal inválido para sorteio ${sorteio.id}: ${sorteio.canais.entrada}`);
      continue;
    }

    // Garante que o sorteio esteja registrado no banco
    db.prepare(`
      INSERT OR IGNORE INTO sorteios (
        id, nome, canal_entrada, canal_registro, canal_resultado, faixa_min, faixa_max, valor_numero, premio_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sorteio.id,
      sorteio.nome,
      sorteio.canais.entrada,
      sorteio.canais.registro,
      sorteio.canais.resultado,
      sorteio.faixa.min,
      sorteio.faixa.max,
      sorteio.valorPorNumero,
      0
    );

    const premio = db.prepare('SELECT premio_total FROM sorteios WHERE id = ?').get(sorteio.id).premio_total;

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${sorteio.nome}`)
      .setDescription(
        `Escolha seus números entre **${sorteio.faixa.min} e ${sorteio.faixa.max}**\n` +
        `💰 Cada número custa R$ ${sorteio.valorPorNumero}\n\n` +
        `Clique no botão abaixo para participar do sorteio!`
      )
      .addFields({ name: '🏆 Prêmio Atual', value: `R$ ${premio.toLocaleString('pt-BR')}` })
      .setColor('Blurple');

    const botao = new ButtonBuilder()
      .setCustomId(`open_modal_${sorteio.id}`)
      .setLabel('🎟 Participar')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(botao);

    // Verifica se já existe mensagem enviada
    const rowCheck = db.prepare('SELECT mensagem_id FROM mensagens_bot WHERE sorteio_id = ?').get(sorteio.id);
    let mensagem;

    if (rowCheck) {
      try {
        mensagem = await canal.messages.fetch(rowCheck.mensagem_id);
        await mensagem.edit({ embeds: [embed], components: [row] });
        console.log(`♻️ Mensagem atualizada para ${sorteio.id}`);
      } catch {
        console.log(`⚠️ Mensagem não encontrada. Criando nova para ${sorteio.id}...`);
      }
    }

    if (!mensagem) {
      mensagem = await canal.send({ embeds: [embed], components: [row] });

      db.prepare(`
        INSERT OR REPLACE INTO mensagens_bot (sorteio_id, mensagem_id)
        VALUES (?, ?)
      `).run(sorteio.id, mensagem.id);

      console.log(`✅ Mensagem criada para ${sorteio.id}`);
    }
  }
};
