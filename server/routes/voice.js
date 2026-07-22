/**
 * Voice Agent Routes - Conversational AI Copilot & Autonomous Telemarketing
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'voice_config.json');
const CALLS_FILE = path.join(DATA_DIR, 'voice_calls.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure files exist
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    prompt: 'Você é um assistente virtual da Nexus Miner. Seu objetivo é ajudar clientes a conhecerem nossos planos de mineração de leads B2B.',
    voice: 'female_br',
    language: 'pt-BR',
    providerKey: '',
    agentId: ''
  }));
}
if (!fs.existsSync(CALLS_FILE)) {
  fs.writeFileSync(CALLS_FILE, JSON.stringify([]));
}

// Helper functions
const getConfig = () => JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const saveConfig = (data) => fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
const getCalls = () => JSON.parse(fs.readFileSync(CALLS_FILE, 'utf8'));
const saveCalls = (data) => fs.writeFileSync(CALLS_FILE, JSON.stringify(data, null, 2));

// Apply auth middleware to all voice agent requests
router.use(authenticate);

// Get Configuration
router.get('/config', (req, res) => {
  try {
    res.json(getConfig());
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler configuração' });
  }
});

// Update Configuration
router.post('/config', (req, res) => {
  try {
    const { prompt, voice, language } = req.body;
    const config = getConfig();
    if (prompt !== undefined) config.prompt = prompt;
    if (voice !== undefined) config.voice = voice;
    if (language !== undefined) config.language = language;
    saveConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// Update Provider
router.post('/provider', (req, res) => {
  try {
    const { providerKey, agentId } = req.body;
    const config = getConfig();
    if (providerKey !== undefined) config.providerKey = providerKey;
    if (agentId !== undefined) config.agentId = agentId;
    saveConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar provedor' });
  }
});

// Get Calls
router.get('/calls', (req, res) => {
  try {
    const calls = getCalls();
    calls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler histórico de chamadas' });
  }
});

// POST /chat - Send transcribed text to voice agent
router.post('/chat', async (req, res) => {
  const { message, mode } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensagem invalida' });
  }

  const isSalesMode = mode === 'sales';
  const cleanMessage = message.toLowerCase().trim();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

  // --- DASHBOARD STATS GATHERING ---
  let stats = { totalLeads: 0, activeClients: 0, mrr: 0, totalRevenue: 0, conversionRate: 0, arpu: 0 };
  if (!isSalesMode) {
    try {
      stats.totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
      stats.activeClients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE active = 1 AND expiry >= date('now')").get().count;
      stats.mrr = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1').get().total;
      stats.totalRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get().total;
      
      const closedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'fechado'").get().count;
      stats.conversionRate = stats.totalLeads > 0 ? ((closedLeads / stats.totalLeads) * 100).toFixed(1) : 0;
      stats.arpu = stats.activeClients > 0 ? (stats.mrr / stats.activeClients).toFixed(0) : 0;
    } catch (err) {
      console.error('[VoiceAgent] DB Stats Gather Error:', err.message);
    }
  }

  // --- AI PROMPT BUILDER ---
  let systemInstruction = "";

  if (isSalesMode) {
    systemInstruction = `Você é um Agente Autônomo de Telemarketing de Inteligência Artificial da "SpeedLog".
Você está AO VIVO em uma ligação com um cliente. O cliente acabou de falar e o texto da fala dele foi transcrito pra você.
Sua missão é conversar de forma amigável (como um humano de verdade), contornar objeções, e VENDER o aplicativo de rastreamento de entregas da SpeedLog, que custa apenas 3 reais.

ROTEIRO MENTAL (Use como guia, mas adapte ao que o cliente falar):
1. Saudação: "Oi, aqui é da SpeedLog. Tudo bem?"
2. Apresentação: "Sua entrega já está a caminho. Para você acompanhar o entregador no mapa em tempo real, temos um app."
3. Fechamento: "É só 3 reais para ativar e você fica sabendo o horário exato que chega, sem precisar ficar ligando. Posso te mandar o link pra baixar?"

REGRAS CRÍTICAS DE ÁUDIO:
- Escreva APENAS a sua fala. Não narre ações. O texto será lido em voz alta por um sintetizador de voz.
- NUNCA use emojis, asteriscos, hashtags ou símbolos matemáticos (escreva "três reais", "cem por cento").
- Fale de forma EXTREMAMENTE concisa (no máximo 2 frases por vez para não parecer um robô dando palestra).
- Seja persuasivo e simpático.`;
  } else {
    systemInstruction = `Você é o Copiloto de Voz por Inteligência Artificial do painel ERP Nexus Miner. 
Sua função é auxiliar o administrador com dados e insights. 
Diga respostas de forma EXTREMAMENTE concisa (no máximo de 2 a 3 frases) com tom amigável e profissional, pois o navegador falará a resposta em voz alta. 
Nunca use emojis nem símbolos no texto de fala, escreva valores por extenso se necessário para soar natural (ex: "cinquenta por cento" em vez de "50%", "reais" após valores).

DADOS REAIS DO PAINEL ATUALIZADOS AGORA NO SEGUNDO CORRENTE:
- Total de Leads Prospectados: ${stats.totalLeads}
- Taxa de Conversão Comercial: ${stats.conversionRate}%
- Clientes Ativos Contratados: ${stats.activeClients}
- Receita Recorrente Mensal (MRR): R$ ${stats.mrr.toLocaleString('pt-BR')}
- Faturamento Total Acumulado: R$ ${stats.totalRevenue.toLocaleString('pt-BR')}
- Ticket Médio por Cliente (ARPU): R$ ${stats.arpu.toLocaleString('pt-BR')}

Se o usuário perguntar sobre leads, vendas, MRR ou dados do painel, responda com base estrita nesses dados acima. Se ele fizer perguntas gerais de negócios ou de outro assunto, responda de forma breve.`;
  }

  // --- GEMINI API CALL ---
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText) {
          return res.json({ response: aiText.trim() });
        }
      }
      console.warn('[VoiceAgent] Gemini API falhou ou retornou payload vazio. Usando fallback local.');
    } catch (err) {
      console.error('[VoiceAgent] Gemini Fetch Error:', err.message);
    }
  }

  // --- FALLBACK LOCAL (Sem Chave API) ---
  let responseText = '';

  if (isSalesMode) {
    responseText = "Desculpe, o Modo de Vendas Ao Vivo precisa da chave de Inteligência Artificial Gemini conectada no servidor para conseguir pensar e negociar com o cliente. Configure sua chave no painel.";
  } else {
    const formattedMrr = stats.mrr.toLocaleString('pt-BR');
    const formattedRevenue = stats.totalRevenue.toLocaleString('pt-BR');

    if (cleanMessage.includes('mrr') || cleanMessage.includes('recorrente') || cleanMessage.includes('mensalidade')) {
      responseText = `O faturamento recorrente mensal da Nexus Miner é de ${formattedMrr} reais, contando com ${stats.activeClients} clientes ativos contratados.`;
    } else if (cleanMessage.includes('lead') || cleanMessage.includes('prospecto') || cleanMessage.includes('conversão')) {
      responseText = `Você possui um total de ${stats.totalLeads} leads no funil de vendas, com uma taxa de conversão comercial de ${stats.conversionRate} por cento.`;
    } else if (cleanMessage.includes('cliente') || cleanMessage.includes('comprador') || cleanMessage.includes('ativo')) {
      responseText = `Atualmente temos ${stats.activeClients} clientes ativos no painel com ticket médio de ${stats.arpu} reais por contrato.`;
    } else if (cleanMessage.includes('faturamento') || cleanMessage.includes('receita') || cleanMessage.includes('venda') || cleanMessage.includes('financeiro')) {
      responseText = `A receita total acumulada no painel é de ${formattedRevenue} reais. O ticket médio dos contratos ativos é de ${stats.arpu} reais.`;
    } else if (cleanMessage.includes('ajuda') || cleanMessage.includes('quem é você') || cleanMessage.includes('o que você faz')) {
      responseText = `Eu sou o Copiloto de Voz da Nexus Miner. Você pode me perguntar sobre faturamento, leads, clientes ativos ou pedir relatórios financeiros.`;
    } else {
      responseText = `Olá! Sou o Copiloto de Voz da Nexus Miner. No momento, o seu MRR é de ${formattedMrr} reais, você possui ${stats.totalLeads} leads prospectados e ${stats.activeClients} clientes ativos no sistema. Como posso te ajudar hoje?`;
    }
  }

  res.json({ response: responseText });
});

module.exports = router;
