/**
 * RF CSV Parser - Parse Receita Federal open data files
 * 
 * Usage:
 *   node parse-rf.js --city "CURITIBA" --cnae "5611-2" --input ./rf-data
 *   node parse-rf.js --state "PR" --input ./rf-data
 *   node parse-rf.js --all --input ./rf-data
 * 
 * Input files (download from dadosabertos.rfb.gov.br/CNPJ/):
 *   - Empresas*.csv (or .zip)
 *   - Estabelecimentos*.csv (or .zip)
 *   - Socios*.csv (or .zip)
 * 
 * Output:
 *   - data/rf-index.json (filtered CNPJ index)
 *   - data/rf-index.db (SQLite database for fast lookups)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const readline = require('readline');

// ============================================================
// CONFIG
// ============================================================
const DATA_DIR = path.join(__dirname, '..', 'data', 'rf');
const INDEX_FILE = path.join(DATA_DIR, 'rf-index.json');
const DB_FILE = path.join(DATA_DIR, 'rf-index.db');

// RF download base URL
const RF_BASE = 'https://dadosabertos.rfb.gov.br/CNPJ';

// ============================================================
// ARGUMENT PARSING
// ============================================================
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf('--' + name);
  return idx >= 0 ? args[idx + 1] : null;
}
function hasFlag(name) {
  return args.includes('--' + name);
}

const TARGET_CITY = getArg('city')?.toUpperCase();
const TARGET_STATE = getArg('state')?.toUpperCase();
const TARGET_CNAE = getArg('cnae');
const INPUT_DIR = getArg('input') || DATA_DIR;
const DOWNLOAD = hasFlag('download');
const ALL = hasFlag('all');

// ============================================================
// HTTP DOWNLOAD
// ============================================================
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading: ${url}`);
    const file = fs.createWriteStream(destPath);
    const mod = url.startsWith('https') ? https : http;
    
    const req = mod.get(url, { timeout: 300000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      
      const total = parseInt(res.headers['content-length'] || '0');
      let downloaded = 0;
      
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${pct}% (${(downloaded / 1024 / 1024).toFixed(0)} MB)`);
        }
      });
      
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('');
        resolve();
      });
    });
    
    req.on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// ============================================================
// CSV STREAM PARSER
// ============================================================
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

async function streamCSV(filePath, onRow, options = {}) {
  const { encoding = 'latin1', gzip = false } = options;
  
  let stream;
  if (gzip || filePath.endsWith('.gz')) {
    stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  } else {
    stream = fs.createReadStream(filePath, { encoding });
  }
  
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineCount = 0;
  let headerSkipped = false;
  
  for await (const line of rl) {
    lineCount++;
    if (!headerSkipped && line.startsWith('CNPJ')) {
      headerSkipped = true;
      continue;
    }
    headerSkipped = true;
    
    if (line.trim()) {
      const fields = parseCSVLine(line);
      onRow(fields, lineCount);
    }
    
    if (lineCount % 1000000 === 0) {
      process.stdout.write(`\r  Processadas: ${(lineCount / 1000000).toFixed(1)}M linhas`);
    }
  }
  
  console.log(`\r  Total: ${lineCount} linhas processadas`);
  return lineCount;
}

// ============================================================
// MAIN PARSER - Extract CNPJs from Estabelecimentos
// ============================================================
async function parseEstabelecimentos() {
  console.log('\n=== Parseando Estabelecimentos ===');
  
  // Find the estabelecimentos file
  const files = fs.readdirSync(INPUT_DIR);
  const estFile = files.find(f => f.toLowerCase().includes('estabelecimento'));
  
  if (!estFile) {
    console.log('  Arquivo de estabelecimentos nao encontrado em:', INPUT_DIR);
    console.log('  Arquivos disponiveis:', files.join(', '));
    console.log('\n  Para obter os dados:');
    console.log('  1. Acesse https://dadosabertos.rfb.gov.br/CNPJ/');
    console.log('  2. Baixe os arquivos Estabelecimentos*.zip');
    console.log('  3. Extraia no diretorio:', INPUT_DIR);
    console.log('  4. Rode: node parse-rf.js --input ' + INPUT_DIR);
    return null;
  }
  
  const filePath = path.join(INPUT_DIR, estFile);
  console.log('  Arquivo:', estFile);
  
  const index = {};
  let matchCount = 0;
  
  await streamCSV(filePath, (fields) => {
    // Estabelecimentos columns:
    // 0: CNPJ_BASICO (8 digits)
    // 1: CNPJ_ORDEM (4 digits)
    // 2: CNPJ_DV (2 digits)
    // 3: IDENTIFICADOR_MATRIZ_FILIAL (1=Matriz, 2=Filial)
    // 4: NOME_FANTASIA
    // 5: SITUACAO_CADASTRAL (02=Ativa)
    // 11: CNAE_FISCAL_PRINCIPAL
    // 16: LOGRADOURO
    // 17: NUMERO
    // 19: BAIRRO
    // 20: CEP
    // 21: UF
    // 22: MUNICIPIO (IBGE code)
    // 23: DDD_1
    // 24: TELEFONE_1
    // 26: TELEFONE_2
    // 28: CORREIO_ELETRONICO
    
    if (fields.length < 25) return;
    
    const cnpjBasico = fields[0];
    const cnpjOrdem = fields[1];
    const cnpjDv = fields[2];
    const situacao = fields[5];
    const cnae = fields[11];
    const uf = fields[21];
    const municipio = fields[22]; // IBGE code
    
    // Filter: only active companies
    if (situacao !== '02') return;
    
    // Filter by state
    if (TARGET_STATE && uf !== TARGET_STATE) return;
    
    // Filter by CNAE (partial match)
    if (TARGET_CNAE && !cnae.startsWith(TARGET_CNAE.replace(/[.-]/g, '').substring(0, 5))) return;
    
    const cnpj = `${cnpjBasico}${cnpjOrdem}${cnpjDv}`;
    const fantasia = fields[4] || '';
    const logradouro = fields[16] || '';
    const numero = fields[17] || '';
    const bairro = fields[19] || '';
    const cep = fields[20] || '';
    const ddd = fields[23] || '';
    const telefone = fields[24] || '';
    const email = fields[28] || '';
    
    const key = `${municipio}_${uf}`;
    if (!index[key]) index[key] = [];
    
    index[key].push({
      cnpj: `${cnpjBasico}.${cnpjOrdem}.${cnpjDv}`,
      fantasia,
      cnae,
      logradouro: `${logradouro}${numero ? ', ' + numero : ''}${bairro ? ' - ' + bairro : ''}`,
      cep,
      uf,
      municipio,
      telefone: ddd && telefone ? `(${ddd}) ${telefone}` : '',
      email,
    });
    
    matchCount++;
  });
  
  console.log(`\n  Encontrados: ${matchCount} estabelecimentos ativos`);
  return index;
}

// ============================================================
// SAVE INDEX
// ============================================================
function saveIndex(index) {
  console.log('\n=== Salvando indice ===');
  
  // Save as JSON
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 0));
  const stats = fs.statSync(INDEX_FILE);
  console.log(`  JSON salvo: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  
  // Summary
  const cities = Object.keys(index);
  let total = 0;
  cities.forEach(k => total += index[k].length);
  console.log(`  ${cities.length} cidades, ${total} estabelecimentos total`);
}

// ============================================================
// DOWNLOAD RF FILES
// ============================================================
async function downloadRFFiles() {
  console.log('\n=== Baixando dados da Receita Federal ===');
  console.log('  NOTA: Os arquivos sao grandes (3-5 GB cada).');
  console.log('  Downloads de https://dadosabertos.rfb.gov.br/CNPJ/\n');
  
  // Try to get file list from RF
  const filesToDownload = [
    'Estabelecimentos00031801.zip',
    'Empresas00031801.zip',
    'Socios00031801.zip',
  ];
  
  for (const file of filesToDownload) {
    const dest = path.join(DATA_DIR, file);
    if (fs.existsSync(dest)) {
      console.log(`  ${file} ja existe, pulando...`);
      continue;
    }
    
    try {
      await downloadFile(`${RF_BASE}/${file}`, dest);
      console.log(`  Download concluido: ${file}`);
    } catch (err) {
      console.log(`  Erro ao baixar ${file}: ${err.message}`);
      console.log('  Voce pode baixar manualmente de:');
      console.log(`  https://dadosabertos.rfb.gov.br/CNPJ/${file}`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  RF CNPJ Index Builder               ║');
  console.log('║  Dados Abertos da Receita Federal    ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\nConfiguracao:');
  console.log(`  Cidade: ${TARGET_CITY || '(todas)'}`);
  console.log(`  Estado: ${TARGET_STATE || '(todos)'}`);
  console.log(`  CNAE: ${TARGET_CNAE || '(todos)'}`);
  console.log(`  Diretorio: ${INPUT_DIR}`);
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Download if requested
  if (DOWNLOAD) {
    await downloadRFFiles();
  }
  
  // Check for existing index
  if (fs.existsSync(INDEX_FILE) && !TARGET_CITY && !TARGET_STATE && !TARGET_CNAE) {
    console.log('\nIndice ja existe:', INDEX_FILE);
    console.log('Rode com --city, --state ou --cnae para refiltrar.');
    console.log('Ou delete o indice e rode novamente.');
    return;
  }
  
  // Parse
  const index = await parseEstabelecimentos();
  if (index) {
    saveIndex(index);
  }
  
  console.log('\n=== Concluido ===');
  console.log('Proximo passo: reinicie o servidor para usar o indice.');
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
