const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); // Dynamic import for node-fetch if needed or use native fetch in Node 18+

const router = express.Router();

// Native fetch is available in Node 18+
const nativeFetch = typeof fetch === 'undefined' ? global.fetch : fetch;

// Public route for rendering a site
router.get('/p/:slug', (req, res) => {
  try {
    const site = db.prepare('SELECT * FROM sites WHERE slug = ?').get(req.params.slug);
    if (!site) return res.status(404).send('Site não encontrado.');
    
    // Serve the raw HTML directly
    res.send(site.html_content);
  } catch (err) {
    res.status(500).send('Erro interno do servidor.');
  }
});

// All routes below require authentication
router.use(authenticate);

router.get('/', (req, res) => {
  try {
    const sites = db.prepare('SELECT id, name, description, slug, status, created_at FROM sites ORDER BY created_at DESC').all();
    res.json({ sites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  const { name, description, colors, services, diff, prompt: style, contact } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

  if (!GEMINI_API_KEY && !OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
    // Generate fallback simulated site
    try {
      const safeName = name || 'Minha Empresa';
      const baseSlug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'site';
      const slug = baseSlug + '-' + crypto.randomUUID().substring(0, 8);
      const siteId = crypto.randomUUID();

      function getFallbackHtml(sName, sDesc) {
        return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>\${sName}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet"></head><body class="bg-slate-900 text-white font-sans"><nav class="p-6 flex justify-between items-center border-b border-slate-800"><div class="text-2xl font-bold text-indigo-500"><i class="fa-solid fa-bolt mr-2"></i>\${sName}</div><div class="space-x-4 hidden md:block"><a href="#" class="hover:text-indigo-400 px-3">Início</a><a href="#" class="hover:text-indigo-400 px-3">Serviços</a><a href="#" class="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-full font-bold ml-4 transition-all">Contato</a></div></nav><header class="container mx-auto px-6 py-20 text-center"><h1 class="text-5xl md:text-7xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Transforme seu Negócio Hoje</h1><p class="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">\${sDesc || 'Soluções inovadoras para escalar os seus resultados através de tecnologia de ponta e automação inteligente.'}</p><button class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg shadow-indigo-500/30 transition-all">Começar Agora <i class="fa-solid fa-arrow-right ml-2"></i></button><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2000&auto=format&fit=crop" class="mt-16 rounded-2xl shadow-2xl border border-slate-700 max-w-4xl mx-auto"></header><a href="#" class="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg text-3xl hover:bg-green-400 transition-all z-50"><i class="fa-brands fa-whatsapp"></i></a></body></html>`;
      }

      const fallbackHtml = getFallbackHtml(safeName, description);
      db.prepare(`
        INSERT INTO sites (id, name, description, slug, html_content)
        VALUES (?, ?, ?, ?, ?)
      `).run(siteId, safeName, description || '', slug, fallbackHtml);

      return res.json({ id: siteId, slug: slug, html: fallbackHtml, name: safeName, mocked: true });
    } catch (err) {
      console.error("Erro na geracao simulada:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  const systemPrompt = `Você é um desenvolvedor web especialista, focado em criar landing pages de ALTÍSSIMA conversão, extrema beleza estética e visual RICO EM IMAGENS.
Seu objetivo é gerar um site corporativo / SaaS completo, longo e de ponta a ponta, estruturado para VENDER.
O código deve ser um único arquivo HTML contendo todo o CSS (inline ou tags <style>) e JS necessário.
O design OBRIGATORIAMENTE deve seguir o estilo: "${style}". Use Dark Mode por padrão, MAS mude para Light Mode se as instruções do cliente pedirem cores claras.

ATENÇÃO MÁXIMA AOS PEDIDOS DO CLIENTE (PRIORIDADE ABSOLUTA):
Leia atentamente a seção <INSTRUCOES_DO_CLIENTE> abaixo. O que estiver escrito lá DEVE SOBRESCREVER qualquer outra regra.
- Se o cliente pedir uma cor específica na descrição, você DEVE usar essa cor no CSS.
- Se o cliente pedir uma função específica (ex: botão do whatsapp flutuante), você DEVE incluir o HTML/CSS/JS correspondente.
- Se o cliente fornecer contatos (telefone, whatsapp, instagram), insira-os no footer, navbar ou botões flutuantes.

<INSTRUCOES_DO_CLIENTE>
Nome da Empresa: ${name}
Segmento/Serviços: ${services}
Objetivo Principal: ${diff}
Cores Preferidas (Hex/Nome): ${colors}
Descrição Geral e COMANDOS ESPECIAIS: ${description}

Dados de Contato a Inserir no Site:
- Público-Alvo: ${contact?.targetAudience || 'Não informado'}
- Localização: ${contact?.cityState || 'Não informado'}
- Telefone: ${contact?.phone || 'Não informado'}
- WhatsApp: ${contact?.whatsapp || 'Não informado'}
- Email: ${contact?.email || 'Não informado'}
- Site: ${contact?.website || 'Não informado'}
- Instagram: ${contact?.instagram || 'Não informado'}
- Facebook: ${contact?.facebook || 'Não informado'}
</INSTRUCOES_DO_CLIENTE>

REGRAS DE ESTRUTURA E CONTEÚDO:
- Use a tag <img> para adicionar placeholders do Unsplash (ex: https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=800&auto=format&fit=crop). Não entregue um site sem imagens!
- Inclua: Navbar, Hero Section com grande Imagem/Mockup de fundo, "Trusted By", Seções alternadas (Texto+Imagem), Grade de Funcionalidades, Depoimentos, Tabela de Preços, FAQ e Footer rico.
- Retorne APENAS o código HTML completo dentro de tags \`\`\`html \`\`\` e NADA MAIS.`;

  try {
    let html = '';
    
    // ANTHROPIC (Claude 3.5 Sonnet) - BEST for UI coding
    if (ANTHROPIC_API_KEY) {
      console.log('[AI] Usando Anthropic Claude 3.5 Sonnet');
      const response = await nativeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 8192,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: 'user', content: 'Crie o site agora conforme as instruções.' }]
        })
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const text = data.content[0].text;
      let htmlMatch = text.match(/```html([\s\S]*?)```/);
      html = htmlMatch ? htmlMatch[1] : text.replace(/```.*?/g, '');

    // OPENAI (GPT-4o) - Excellent for UI coding
    } else if (OPENAI_API_KEY) {
      console.log('[AI] Usando OpenAI GPT-4o');
      const response = await nativeFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Crie o site agora conforme as instruções.' }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const text = data.choices[0].message.content;
      let htmlMatch = text.match(/```html([\s\S]*?)```/);
      html = htmlMatch ? htmlMatch[1] : text.replace(/```.*?/g, '');

    // GEMINI (1.5 Pro)
    } else {
      console.log('[AI] Usando Google Gemini 1.5 Pro');
      const response = await nativeFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let htmlMatch = text.match(/```html([\s\S]*?)```/);
      html = htmlMatch ? htmlMatch[1] : text.replace(/```.*?/g, '');
    }

    // Save to DB
    const id = crypto.randomUUID();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    
    db.prepare(`
      INSERT INTO sites (id, name, description, html_content, slug, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'published', ?)
    `).run(id, name, description, html, slug, req.user?.id || null);

    res.json({ id, slug, html, name });
  } catch (err) {
    console.error('[AI] Erro ao gerar site:', err);
    res.status(500).json({ error: 'Erro ao gerar site com IA: ' + err.message });
  }
});

router.post('/:id/export', (req, res) => {
  // Mock export - in reality, zip the HTML
  res.json({ message: "Exportação iniciada." });
});

module.exports = router;
