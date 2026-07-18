/**
 * RF Search Service - Search CNPJs from Receita Federal open data index
 */

const fs = require('fs');
const path = require('path');

const INDEX_FILE = path.join(__dirname, '..', 'data', 'rf', 'rf-index.json');

let index = null;
let loaded = false;

// ============================================================
// LOAD INDEX (async)
// ============================================================
async function loadIndex() {
  if (loaded) return index;

  const { existsSync, promises: fsPromises } = fs;

  if (!existsSync(INDEX_FILE)) {
    index = null;
    loaded = true;
    return null;
  }

  try {
    const raw = await fsPromises.readFile(INDEX_FILE, 'utf8');
    index = JSON.parse(raw);
    loaded = true;
    const cities = Object.keys(index);
    let total = 0;
    cities.forEach(k => total += index[k].length);
    console.log(`  RF Index carregado: ${cities.length} cidades, ${total} estabelecimentos`);
    return index;
  } catch (err) {
    console.error('  Erro ao carregar RF index:', err.message);
    index = null;
    loaded = true;
    return null;
  }
}

// ============================================================
// SEARCH
// ============================================================
async function searchByCity(city, cnaeFilter, limit = 100) {
  const idx = await loadIndex();
  if (!idx) return { results: [], total: 0, indexAvailable: false };
  
  const cityUpper = city.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let results = [];
  
  // Find matching cities
  for (const [key, establishments] of Object.entries(idx)) {
    const [municipio, uf] = key.split('_');
    
    // Match city name (partial, accent-insensitive)
    if (!municipio.toUpperCase().includes(cityUpper) && !cityUpper.includes(municipio.toUpperCase())) {
      continue;
    }
    
    for (const est of establishments) {
      // Filter by CNAE if specified
      if (cnaeFilter) {
        const cleanCnae = cnaeFilter.replace(/[.-]/g, '');
        if (!est.cnae.startsWith(cleanCnae.substring(0, 5))) continue;
      }
      
      results.push({
        cnpj: est.cnpj,
        nome: est.fantasia || est.razaoSocial || '',
        atividade: est.cnae,
        endereco: `${est.logradouro}, ${est.cep} - ${est.uf}`,
        telefone: est.telefone || '',
        email: est.email || '',
        uf: est.uf,
        municipio: municipio,
      });
      
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }
  
  return {
    results: results.slice(0, limit),
    total: results.length,
    indexAvailable: true,
  };
}

async function getStats() {
  const idx = await loadIndex();
  if (!idx) return { available: false };
  
  const cities = Object.keys(idx);
  let total = 0;
  cities.forEach(k => total += idx[k].length);
  
  return {
    available: true,
    cities: cities.length,
    total,
    sampleCities: cities.slice(0, 20),
  };
}

module.exports = { searchByCity, getStats, loadIndex };
