const { EmbedBuilder } = require('discord.js');

function embedSorteio(numero, ganhador, premio) {
  const embed = new EmbedBuilder()
    .setTitle('🎯 Resultado do Sorteio')
    .setDescription(`O número sorteado foi **${numero}**.`)
    .setColor(ganhador ? 'Green' : 'Red')
    .setTimestamp();

  if (ganhador) {
    embed.addFields({
      name: '🏆 Ganhador',
      value: `<@${ganhador}> ganhou **R$ ${premio.toLocaleString('pt-BR')}**!`
    });
  } else {
    embed.addFields(
      { name: '😢 Sem Ganhador', value: 'Ninguém escolheu esse número.' },
      { name: '📈 Prêmio Acumulado', value: 'O valor foi acumulado para o próximo sorteio.' }
    );
  }

  return embed;
}

function embedErro(msg) {
  return new EmbedBuilder()
    .setTitle('❌ Erro')
    .setDescription(msg)
    .setColor('Red');
}

function embedInfo(titulo, descricao) {
  return new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor('Blue');
}

module.exports = {
  embedSorteio,
  embedErro,
  embedInfo
};
