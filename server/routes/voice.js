/**
 * Voice Agent Routes - Conversational AI Copilot
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all voice agent requests
router.use(authenticate);

// POST /api/voice-agent/chat - Send transcribed text to voice agent
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensagem invalida' });
  }

  // 1. Gather real-time system stats from DB
  let stats = {
    totalLeads: 0,
    activeClients: 0,
    mrr: 0,
    totalRevenue: 0,
    conversionRate: 0,
    arpu: 0
  };

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

  const cleanMessage = message.toLowerCase().trim();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

  // 2. If Gemini API Key is configured, use Gemini API via native fetch
  if (GEMINI_API_KEY) {
    try {
      const systemInstruction = `Você é o Copiloto de Voz por Inteligência Artificial do painel ERP Nexus Miner. 
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

  // 3. Fallback: Local NLP Interpreter Ruleset
  let responseText = '';

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

  res.json({ response: responseText });
});

module.exports = router;
