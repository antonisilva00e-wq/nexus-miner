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

  if (!GEMINI_API_KEY) {
    try {
      // Generate a fallback simulated site for testing if no key is provided
      const safeName = name || 'Minha Empresa';
      const baseSlug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'site';
      const slug = baseSlug + '-' + crypto.randomUUID().substring(0, 8);
      const siteId = crypto.randomUUID();

      // Premium, highly robust fallback template with glassmorphism, animations, and full sections
      function getFallbackHtml(sName, sDesc) {
    const descLower = (sDesc || '').toLowerCase();
    
    // Parse Colors
    let primary = '#4338ca'; // Default Indigo
    let primaryLight = '#6366f1';
    let accent = '#38bdf8';
    let dark = '#0f172a';
    let darker = '#020617';
    let isLight = false;

    if (descLower.includes('vermelho')) { primary = '#dc2626'; primaryLight = '#ef4444'; accent = '#fca5a5'; }
    else if (descLower.includes('verde')) { primary = '#16a34a'; primaryLight = '#22c55e'; accent = '#86efac'; }
    else if (descLower.includes('azul')) { primary = '#2563eb'; primaryLight = '#3b82f6'; accent = '#93c5fd'; }
    else if (descLower.includes('roxo')) { primary = '#7e22ce'; primaryLight = '#a855f7'; accent = '#d8b4fe'; }
    else if (descLower.includes('amarelo') || descLower.includes('ouro')) { primary = '#ca8a04'; primaryLight = '#eab308'; accent = '#fef08a'; }
    else if (descLower.includes('rosa')) { primary = '#db2777'; primaryLight = '#ec4899'; accent = '#f9a8d4'; }
    else if (descLower.includes('laranja')) { primary = '#ea580c'; primaryLight = '#f97316'; accent = '#fdba74'; }
    else if (descLower.includes('preto') || descLower.includes('escuro')) { primary = '#334155'; primaryLight = '#475569'; accent = '#94a3b8'; }

    if (descLower.includes('claro') || descLower.includes('branco')) {
        isLight = true;
        dark = '#f8fafc';
        darker = '#f1f5f9';
    }

    const s1 = Math.floor(Math.random()*1000);
    const s2 = Math.floor(Math.random()*1000);
    const s3 = Math.floor(Math.random()*1000);
    const s4 = Math.floor(Math.random()*1000);
    const s5 = Math.floor(Math.random()*1000);
    
    // Randomize layout flavor
    const flavor = Math.floor(Math.random() * 3); // 0, 1, or 2

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sName} | Soluções Inteligentes</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root { --primary: ${primary}; --primary-light: ${primaryLight}; --dark: ${dark}; --darker: ${darker}; --light: ${isLight ? '#0f172a' : '#f8fafc'}; --accent: ${accent}; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; scroll-behavior: smooth; }
        body { background-color: var(--darker); color: var(--light); overflow-x: hidden; }
        .navbar { position: fixed; top: 0; width: 100%; z-index: 1000; padding: 1.5rem 5%; display: flex; justify-content: space-between; align-items: center; background: ${isLight ? 'rgba(255,255,255,0.8)' : 'rgba(2, 6, 23, 0.8)'}; backdrop-filter: blur(12px); border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}; transition: all 0.3s; }
        .logo { font-size: 1.5rem; font-weight: 800; background: linear-gradient(to right, ${isLight ? 'var(--primary)' : '#fff'}, var(--primary-light)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-links { display: flex; gap: 2rem; list-style: none; align-items: center; }
        .nav-links a { color: ${isLight ? '#475569' : '#cbd5e1'}; text-decoration: none; font-weight: 500; transition: color 0.3s; }
        .nav-links a:hover { color: var(--primary); }
        .btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-light)); padding: 0.75rem 1.5rem; border-radius: 8px; color: white !important; font-weight: 600; box-shadow: 0 4px 15px ${primary}66; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px ${primary}99; }
        .btn-login { background: ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'}; padding: 0.75rem 1.5rem; border-radius: 8px; color: var(--light) !important; font-weight: 600; border: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}; transition: all 0.3s; }
        .btn-login:hover { background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}; }
        .hero { min-height: 100vh; display: flex; flex-direction: ${flavor === 1 ? 'row' : 'column'}; align-items: center; justify-content: center; text-align: ${flavor === 1 ? 'left' : 'center'}; padding: 8rem 5% 4rem; position: relative; overflow: hidden; background: radial-gradient(circle at 50% 0%, ${primary}33 0%, transparent 70%); gap: 4rem; }
        .hero h1 { font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: 1.1; margin-bottom: 1.5rem; max-width: 900px; font-weight: 900; }
        .hero h1 span { color: var(--primary); position: relative; }
        .hero p { font-size: 1.25rem; color: ${isLight ? '#64748b' : '#94a3b8'}; max-width: 600px; margin-bottom: 2.5rem; line-height: 1.6; ${flavor === 1 ? 'margin-left: 0;' : 'margin-left: auto; margin-right: auto;'} }
        .hero-btns { display: flex; gap: 1rem; margin-bottom: 4rem; z-index: 2; ${flavor === 1 ? 'justify-content: flex-start;' : 'justify-content: center;'} }
        .btn-large { padding: 1rem 2rem; font-size: 1.1rem; }
        .dashboard-preview { width: 100%; max-width: ${flavor === 1 ? '600px' : '1000px'}; height: ${flavor === 1 ? '400px' : '500px'}; background: ${isLight ? 'rgba(255,255,255,0.7)' : 'rgba(15, 23, 42, 0.7)'}; border: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; box-shadow: 0 30px 60px rgba(0,0,0,0.3), 0 0 100px ${primary}33; backdrop-filter: blur(20px); transform: perspective(1000px) ${flavor === 1 ? 'rotateY(-5deg)' : 'rotateX(5deg)'}; position: relative; z-index: 10; display: flex; flex-direction: column; overflow: hidden; }
        
        .section-title { text-align: center; margin-bottom: 4rem; }
        .section-title h2 { font-size: 2.5rem; margin-bottom: 1rem; font-weight: 800; }
        .section-title p { color: ${isLight ? '#64748b' : '#94a3b8'}; font-size: 1.1rem; }
        .features { padding: 8rem 5%; background: var(--dark); position: relative; }
        .grid-features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto; }
        .feature-card { background: ${isLight ? '#fff' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}; padding: 2.5rem; border-radius: 16px; transition: all 0.3s; position: relative; overflow: hidden; box-shadow: ${isLight ? '0 10px 30px rgba(0,0,0,0.05)' : 'none'}; }
        .feature-card:hover { transform: translateY(-10px); border-color: var(--primary); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .feature-icon { font-size: 2.5rem; color: var(--primary); margin-bottom: 1.5rem; }
        .feature-card h3 { font-size: 1.4rem; margin-bottom: 1rem; color: var(--light); }
        .feature-card p { color: ${isLight ? '#64748b' : '#94a3b8'}; line-height: 1.6; }
        .feature-card img { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 1.5rem; opacity: 0.9; transition: opacity 0.3s; }
        .feature-card:hover img { opacity: 1; }
        
        .content-section { padding: 6rem 5%; background: var(--darker); display: flex; align-items: center; justify-content: center; gap: 4rem; flex-direction: ${flavor === 2 ? 'row-reverse' : 'row'}; }
        .content-text { flex: 1; max-width: 500px; }
        .content-text h3 { font-size: 2.2rem; margin-bottom: 1rem; color: var(--light); line-height: 1.2; }
        .content-text p { color: ${isLight ? '#64748b' : '#94a3b8'}; font-size: 1.1rem; line-height: 1.7; margin-bottom: 1.5rem; }
        .content-image { flex: 1; max-width: 600px; }
        .content-image img { width: 100%; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'}; }
        
        .testimonials { padding: 6rem 5%; background: var(--dark); text-align: center; }
        .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto; }
        .testimonial-card { background: ${isLight ? '#fff' : 'rgba(255,255,255,0.02)'}; padding: 2rem; border-radius: 16px; border: 1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}; text-align: left; }
        .testimonial-card p { color: ${isLight ? '#475569' : '#cbd5e1'}; font-style: italic; margin-bottom: 1.5rem; line-height: 1.6; }
        .testimonial-author { display: flex; align-items: center; gap: 1rem; }
        .testimonial-author img { width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--primary); }
        .author-info h4 { margin: 0; color: var(--light); }
        
        .pricing { padding: 8rem 5%; background: var(--darker); }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto; }
        .pricing-card { background: ${isLight ? '#fff' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}; padding: 3rem 2rem; border-radius: 20px; text-align: center; position: relative; }
        .pricing-card.premium { background: ${isLight ? primary+'11' : primary+'1A'}; border-color: var(--primary); transform: scale(1.05); }
        .pricing-card.premium::before { content: 'Recomendado'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 4px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
        .pricing-card h3 { font-size: 1.5rem; margin-bottom: 1rem; color: var(--light); }
        .pricing-card .price { font-size: 3rem; font-weight: 900; margin-bottom: 2rem; color: var(--light); }
        .pricing-card .price span { font-size: 1rem; color: ${isLight ? '#64748b' : '#94a3b8'}; font-weight: normal; }
        .pricing-card ul { list-style: none; margin-bottom: 2.5rem; text-align: left; }
        .pricing-card ul li { margin-bottom: 1rem; color: ${isLight ? '#475569' : '#cbd5e1'}; }
        .pricing-card ul li i { color: var(--primary); margin-right: 10px; }
        
        .media-img { width: 100%; max-width: 1000px; height: 450px; background-image: url('https://picsum.photos/seed/${s5}/1200/600'); background-size: cover; background-position: center; border-radius: 20px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); border: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}; margin-top: 3rem; }
        
        footer { padding: 4rem 5%; border-top: 1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}; text-align: center; color: ${isLight ? '#64748b' : '#64748b'}; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="logo">${sName}</div>
        <ul class="nav-links">
            <li><a href="#inicio">Início</a></li>
            <li><a href="#solucoes">Soluções</a></li>
            <li><a href="#precos">Planos</a></li>
            <li><a href="#" class="btn-primary">Começar Agora</a></li>
        </ul>
    </nav>
    <section class="hero" id="inicio">
        <div style="z-index:2; max-width: 600px;">
            <h1>A solução completa para <span>impulsionar</span> seu negócio</h1>
            <p>${sDesc || 'Automatize seus processos, atraia mais clientes e gerencie tudo em um único painel inteligente e intuitivo.'}</p>
            <div class="hero-btns">
                <a href="#" class="btn-primary btn-large">Criar Conta Grátis</a>
                <a href="#solucoes" class="btn-login btn-large" style="background:transparent;">Ver Funcionalidades</a>
            </div>
        </div>
        <div class="dashboard-preview" style="z-index:2;">
            <div style="height: 40px; background: ${isLight ? '#f1f5f9' : 'rgba(0,0,0,0.3)'}; border-bottom: 1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}; display: flex; align-items: center; padding: 0 1rem; gap: 8px;"><div style="width:12px; height:12px; border-radius:50%; background:#ef4444;"></div><div style="width:12px; height:12px; border-radius:50%; background:#eab308;"></div><div style="width:12px; height:12px; border-radius:50%; background:#22c55e;"></div></div>
            <div style="padding: 2rem; display: flex; gap: 2rem; height: 100%;">
                <div style="width: 200px; background: ${isLight ? '#f8fafc' : 'rgba(0,0,0,0.3)'}; border-radius: 8px;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display: flex; gap: 1rem;">
                        <div style="flex: 1; height: 100px; background: ${primary}33; border: 1px solid ${primary}44; border-radius: 8px;"></div>
                        <div style="flex: 1; height: 100px; background: ${accent}33; border: 1px solid ${accent}44; border-radius: 8px;"></div>
                        <div style="flex: 1; height: 100px; background: ${isLight ? '#f1f5f9' : 'rgba(255,255,255, 0.05)'}; border-radius: 8px;"></div>
                    </div>
                    <div style="flex: 1; background: ${isLight ? '#f8fafc' : 'rgba(0,0,0,0.3)'}; border-radius: 8px;"></div>
                </div>
            </div>
        </div>
    </section>
    
    <section class="features" id="solucoes">
        <div class="section-title"><h2>Por que escolher a ${sName}?</h2><p>Tudo o que você precisa em uma estrutura projetada para converter.</p></div>
        <div class="grid-features">
            <div class="feature-card"><img src="https://picsum.photos/seed/${s1}/500/300" alt="Dashboard"><div class="feature-icon"><i class="fas fa-rocket"></i></div><h3>Performance Extrema</h3><p>Infraestrutura de alta disponibilidade garantindo que seu sistema carregue instantaneamente.</p></div>
            <div class="feature-card"><img src="https://picsum.photos/seed/${s2}/500/300" alt="Security"><div class="feature-icon"><i class="fas fa-shield-alt"></i></div><h3>Segurança Bancária</h3><p>Proteção avançada de dados, criptografia ponta a ponta e backups automáticos.</p></div>
            <div class="feature-card"><img src="https://picsum.photos/seed/${s3}/500/300" alt="Analytics"><div class="feature-icon"><i class="fas fa-chart-line"></i></div><h3>Painel Analítico</h3><p>Métricas em tempo real e relatórios detalhados para tomar decisões inteligentes.</p></div>
        </div>
    </section>
    
    <section class="content-section">
        <div class="content-text">
            <h3>Visualização completa do crescimento</h3>
            <p>Acesse gráficos interativos, relatórios detalhados e insights de inteligência artificial em um painel unificado.</p>
            <ul style="list-style:none; padding:0; margin-bottom:1.5rem; color:${isLight ? '#475569' : '#cbd5e1'};">
                <li style="margin-bottom:0.5rem;"><i class="fas fa-check-circle" style="color:var(--primary); margin-right:8px;"></i> Previsões baseadas em IA</li>
                <li style="margin-bottom:0.5rem;"><i class="fas fa-check-circle" style="color:var(--primary); margin-right:8px;"></i> Exportação simplificada</li>
            </ul>
        </div>
        <div class="content-image"><img src="https://picsum.photos/seed/${s4}/800/600" alt="Business Growth"></div>
    </section>
    
    <section class="testimonials">
        <div class="section-title"><h2>O que dizem nossos parceiros</h2></div>
        <div class="testimonials-grid">
            <div class="testimonial-card">
                <p>"Desde que implementamos a ${sName}, nosso tempo de análise caiu pela metade."</p>
                <div class="testimonial-author"><img src="https://i.pravatar.cc/150?u=${s1}" alt="User"><div class="author-info"><h4>Sarah Jenkins</h4><span>Diretora de Operações</span></div></div>
            </div>
            <div class="testimonial-card">
                <p>"A facilidade de uso e a segurança oferecida nos deram tranquilidade para escalar."</p>
                <div class="testimonial-author"><img src="https://i.pravatar.cc/150?u=${s2}" alt="User"><div class="author-info"><h4>Marcus Silva</h4><span>CEO & Fundador</span></div></div>
            </div>
        </div>
    </section>
    
    <section class="pricing" id="precos">
        <div class="section-title"><h2>Planos e Preços</h2></div>
        <div class="pricing-grid">
            <div class="pricing-card">
                <h3>Starter</h3>
                <div class="price">R$ 97<span>/mês</span></div>
                <ul><li><i class="fas fa-check"></i> Até 1.000 acessos</li><li><i class="fas fa-check"></i> Painel Básico</li></ul>
                <button class="btn-login" style="width:100%; margin-top:1rem;">Assinar Starter</button>
            </div>
            <div class="pricing-card premium">
                <h3>Pro</h3>
                <div class="price">R$ 197<span>/mês</span></div>
                <ul><li><i class="fas fa-check"></i> Acessos Ilimitados</li><li><i class="fas fa-check"></i> Funcionalidades Avançadas</li></ul>
                <button class="btn-primary" style="width:100%; margin-top:1rem; border:none; padding:1rem; font-size:1.1rem; border-radius:8px; cursor:pointer;">Assinar Pro</button>
            </div>
        </div>
    </section>
    
    <footer><p>&copy; 2024 ${sName}. Todos os direitos reservados.</p></footer>
</body>
</html>`;
}
const fallbackHtml = getFallbackHtml(safeName, description);
      db.prepare(`
        INSERT INTO sites (id, name, description, slug, html_content)
        VALUES (?, ?, ?, ?, ?)
      `).run(siteId, safeName, description || '', slug, fallbackHtml);

      return res.json({
        id: siteId,
        slug: slug,
        html: fallbackHtml,
        name: safeName,
        mocked: true
      });
    } catch (err) {
      console.error("Erro na geracao simulada:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  const systemPrompt = `Você é um desenvolvedor web especialista, focado em criar landing pages de ALTÍSSIMA conversão, extrema beleza estética e visual RICO EM IMAGENS.
Seu objetivo é gerar um site corporativo / SaaS completo, longo e de ponta a ponta, estruturado para VENDER.
O código deve ser um único arquivo HTML contendo todo o CSS (inline ou tags <style>) e JS necessário.
O design OBRIGATORIAMENTE deve ser "Premium", "Futurista" ou "Elegante". (Use Dark Mode por padrão, MAS mude para Light Mode se o cliente pedir "claro" ou "branco").

ATENÇÃO MÁXIMA AOS PEDIDOS DO CLIENTE (MÁXIMA PRIORIDADE):
- O que o cliente pedir na descrição e na instrução extra (cores, funções específicas, layout, etc.) DEVE SOBRESCREVER qualquer outra regra de design padrão.
- Se o cliente pedir uma cor específica (ex: verde, vermelho, rosa), você DEVE usar essa cor como tema principal do site (botões, detalhes, etc).
- Se o cliente pedir uma função específica (ex: botão de whatsapp flutuante, carrossel, formulário de contato avançado), você DEVE incluir no código.

REGRAS DE ESTRUTURA E CONTEÚDO:
- O site DEVE ser grande e detalhado, simulando uma página real de um SaaS ou Agência grande.
- OBRIGATÓRIO: Use e abuse da tag <img>. Empregue imagens placeholder de alta qualidade do Unsplash (ex: https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=800&auto=format&fit=crop, https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop, ou utilize https://picsum.photos/800/500).
- Não entregue um site vazio só com texto. Adicione imagens de pessoas trabalhando, escritórios, painéis (dashboards), etc.
- Adicione as seguintes seções estruturais de ponta a ponta:
1. Navbar com Logo, Links âncora, botão "Área do Cliente" e botão "Criar Conta".
2. Hero Section de alto impacto com Call-to-Action claro e uma grande imagem de fundo ou mockup flutuante.
3. Seção "Trusted By" (marcas confiam em nós) com ícones ou nomes de grandes marcas (simulados).
4. Seções Alternadas (Texto na Esquerda + Imagem na Direita, e vice-versa) explicando soluções profundas. Use <img> nessas seções.
5. Seção de Funcionalidades em formato de Grade (Grid) longa (6+ cards). Se puder, coloque imagens no topo de cada card.
6. Seção de Depoimentos (Social Proof) com fotos de rosto (use https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop ou similar para os rostos).
7. Tabela de Preços (Pricing) atraente destacando o plano "Recomendado".
8. FAQ (Perguntas Frequentes).
9. Modal de Login oculto que abre ao clicar em "Área do Cliente".
10. Footer rico e profissional.

Retorne APENAS o código HTML completo dentro de tags \`\`\`html \`\`\` e NADA MAIS. NENHUM comentário adicional, apenas o HTML puro. Use ícones (ex: FontAwesome CDN) abundantemente.
Informações do cliente:
Nome: ${name}
Descrição/Segmento: ${description}
Serviços: ${services}
Diferenciais: ${diff}
Cores sugeridas: ${colors}
Instrução extra: ${prompt}`;

  try {
    const response = await nativeFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.4 }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini error:", errorData);
      return res.status(500).json({ error: 'Erro ao gerar site com IA.' });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract HTML
    let htmlMatch = text.match(/```html([\s\S]*?)```/);
    let html = htmlMatch ? htmlMatch[1] : text.replace(/```.*?/g, '');

    // Save to DB
    const id = crypto.randomUUID();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    
    db.prepare(`
      INSERT INTO sites (id, name, description, html_content, slug, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'published', ?)
    `).run(id, name, description, html, slug, req.user?.id || null);

    res.json({ id, slug, html, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/export', (req, res) => {
  // Mock export - in reality, zip the HTML
  res.json({ message: "Exportação iniciada." });
});

module.exports = router;
