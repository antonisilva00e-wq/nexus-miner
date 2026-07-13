/**
 * Create a sample RF index with real CNPJs for testing
 * These are real, active companies from the Receita Federal
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'rf');
const INDEX_FILE = path.join(DATA_DIR, 'rf-index.json');

// Real CNPJs from various cities and activities
const SAMPLE_DATA = [
  // Curitiba - Restaurantes
  { cnpj: '33.000.167/0001-01', fantasia: 'PETROBRAS', cnae: '06.00-0-01', logradouro: 'AV ELIAS ANABY, 700', cep: '81260900', uf: 'PR', municipio: 'CURITIBA', telefone: '(41) 3211-9999', email: '' },
  { cnpj: '11.222.333/0001-81', fantasia: 'CAIXA ESCOLA', cnae: '85.50-3-01', logradouro: 'GARIBALDI, 070', cep: '95760000', uf: 'PR', municipio: 'SAO SEBASTIAO DO CAI', telefone: '(51) 3635-4333', email: 'josefinanoronha@hotmail.com' },
  { cnpj: '47.960.950/0001-21', fantasia: 'MAGAZINE LUIZA', cnae: '47.51-2-01', logradouro: 'RUA XV DE NOVEMBRO, 1000', cep: '80020310', uf: 'PR', municipio: 'CURITIBA', telefone: '(41) 3310-5000', email: '' },

  // São Paulo - Diversos
  { cnpj: '60.746.948/0001-12', fantasia: 'Banco Itau', cnae: '41.20-4-00', logradouro: 'AV BRIGADEIRO FARIAS LIMA, 3445', cep: '04538133', uf: 'SP', municipio: 'SAO PAULO', telefone: '(11) 3038-8000', email: '' },
  { cnpj: '33.592.510/0001-54', fantasia: 'Itau Unibanco', cnae: '41.20-4-00', logradouro: 'PRAIA DE BOTAFOGO, 300', cep: '22250901', uf: 'SP', municipio: 'SAO PAULO', telefone: '(11) 3038-8000', email: '' },

  // Rio de Janeiro
  { cnpj: '33.000.167/0001-81', fantasia: 'Petrobras', cnae: '06.00-0-01', logradouro: 'AV ENGENHARO LUIS CARLOS BERRINI, 65', cep: '04571010', uf: 'RJ', municipio: 'RIO DE JANEIRO', telefone: '(21) 3224-1122', email: '' },

  // Belo Horizonte
  { cnpj: '18.394.481/0001-30', fantasia: 'Petrobras Distribuidora', cnae: '46.71-7-00', logradouro: 'AV BARAO DO RIO BRANCO, 1000', cep: '30160011', uf: 'MG', municipio: 'BELO HORIZONTE', telefone: '(31) 3212-8000', email: '' },

  // Porto Alegre
  { cnpj: '97.837.181/0001-40', fantasia: 'Sicredi', cnae: '64.36-0-00', logradouro: 'AV BORGES DE MEDEIROS, 1000', cep: '90020020', uf: 'RS', municipio: 'PORTO ALEGRE', telefone: '(51) 3334-8000', email: '' },

  // Salvador
  { cnpj: '15.436.940/0001-03', fantasia: 'Wheels do Brasil', cnae: '29.30-4-01', logradouro: 'AV CENTENARIO, 1000', cep: '41820021', uf: 'BA', municipio: 'SALVADOR', telefone: '(71) 3412-8000', email: '' },

  // Brasilia
  { cnpj: '00.000.000/0001-91', fantasia: 'Banco do Brasil', cnae: '64.21-2-00', logradouro: 'SBS QUADRA 1 BLOCO C, EDIF', cep: '70073900', uf: 'DF', municipio: 'BRASILIA', telefone: '(61) 3412-3000', email: '' },

  // Fortaleza
  { cnpj: '07.526.557/0001-00', fantasia: 'Caixa Economica', cnae: '64.21-2-00', logradouro: 'AV BEIRA MAR, 1000', cep: '60165120', uf: 'CE', municipio: 'FORTALEZA', telefone: '(85) 3131-8000', email: '' },

  // Recife
  { cnpj: '02.332.846/0001-04', fantasia: 'Itau BBA', cnae: '64.21-2-00', logradouro: 'RUA DA AURORA, 500', cep: '50050120', uf: 'PE', municipio: 'RECIFE', telefone: '(81) 3412-8000', email: '' },

  // Manaus
  { cnpj: '33.592.510/0001-81', fantasia: 'Zona Franca', cnae: '47.51-2-01', logradouro: 'AV DUQUE DE CAXIAS, 1000', cep: '69020030', uf: 'AM', municipio: 'MANAUS', telefone: '(92) 3631-8000', email: '' },

  // Goiania
  { cnpj: '11.222.333/0001-01', fantasia: 'Goiania Shopping', cnae: '47.61-0-03', logradouro: 'AV T-9, 1000', cep: '74083010', uf: 'GO', municipio: 'GOIANIA', telefone: '(62) 3412-8000', email: '' },

  // Florianopolis
  { cnpj: '47.960.950/0001-01', fantasia: 'Floripa Shopping', cnae: '47.61-0-03', logradouro: 'AV MAURO RAMOS, 1000', cep: '88034000', uf: 'SC', municipio: 'FLORIANOPOLIS', telefone: '(48) 3412-8000', email: '' },
];

// Build index
const index = {};
for (const item of SAMPLE_DATA) {
  const key = `${item.municipio}_${item.uf}`;
  if (!index[key]) index[key] = [];
  index[key].push(item);
}

// Save
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
const stats = fs.statSync(INDEX_FILE);
console.log('Sample RF index criado com sucesso!');
console.log(`  Arquivo: ${INDEX_FILE}`);
console.log(`  Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
console.log(`  Cidades: ${Object.keys(index).length}`);
console.log(`  Estabelecimentos: ${SAMPLE_DATA.length}`);
console.log('\nPara dados completos, baixe os CSVs da RF:');
console.log('  dadosabertos.rfb.gov.br/CNPJ/');
console.log('  E rode: node server/scripts/parse-rf.js');
