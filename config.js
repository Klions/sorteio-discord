module.exports = {
  sorteios: [
    {
      id: 'sorteio1',
      nome: 'Sorteio Principal',
      canais: {
        entrada: '1381620725621719171',   // canal onde aparece o botão de entrada
        registro: '1381766342142726234',  // canal onde lista as entradas registradas
        resultado: '1381772738871427082'  // canal onde envia os resultados
      },
      faixa: {
        min: 1,
        max: 50
      },
      valorPorNumero: 200
    },
    {
      id: 'sorteio2',
      nome: 'Mega Sorteio',
      canais: {
        entrada: '1381792014877851668',
        registro: '1381792037900124232',
        resultado: '1381791992761159771'
      },
      faixa: {
        min: 1,
        max: 100
      },
      valorPorNumero: 500
    }
  ]
};
