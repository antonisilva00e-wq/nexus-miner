/**
 * Scripts Routes - Generate personalized call scripts for leads
 * Style: Natural delivery tracking, conversational, persuasive
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Scripts - Natural, conversational, like a real person calling
const SCRIPTS = {
  'locadoras': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas e reservas',
    scripts: [
      {
        title: 'Script Natural - Locadora',
        greeting: 'Ola, {saudacao}? Aqui e da SpeedLog, transportadora de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que sua entrega ta a caminho ja. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos por SMS, e pronto - la voce ve o entregador no mapa, sabe o horario certo que chega, e ainda recebe um aviso no celular quando tiver perto. E so 3 reais pra ativar, uma mixaria. Posso te ajudar a baixar agora? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, e so me chamar. Um abraco!'
      },
      {
        title: 'Script Conversa - Locadora',
        greeting: 'Oi, {saudacao}? Aqui e da SpeedLog. Posso falar 2 minutos?',
        body: 'Entao, sua entrega ja saiu e ta indo ate voce. Eu ligo pra todos os clientes porque tem uma coisa que facilita muito: a gente tem um app que voce ve em tempo real onde ta o entregador. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho - mapa, horario, tudo. E so 3 reais pra ativar, bem baratinho. A maioria dos clientes que usa, nao quer mais saber de ligar perguntando nada. Quer que eu te mande o link pelo WhatsApp?',
        closing: 'Beleza, te mando o link. E so 3 reais e voce fica tranquilo. Qualquer duvida, so me chamar!'
      }
    ]
  },
  'restaurantes': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas de comida',
    scripts: [
      {
        title: 'Script Natural - Restaurante',
        greeting: 'Ola, {saudacao}? Aqui e da iFood Express, de Sao Paulo. Tudo certo?',
        body: 'Ligando pra te avisar que seu pedido ja saiu e ta a caminho. Olha, pra voce nao ficar olhando o relogio, a gente tem um app que voce ve o entregador no mapa em tempo real. Voce baixa, coloca o codigo do pedido, e la mostra tudinho - onde ta o cara, quanto tempo falta, e avisa quando tiver perto. E so 3 reais pra ativar, uma mixaria. Posso te ajudar a baixar? Leva 2 minutinhos no maximo.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem ficar na duvida. Se precisar de qualquer coisa, so me chamar. Bom apetite!'
      },
      {
        title: 'Script Conversa - Restaurante',
        greeting: 'Oi, {saudacao}? Aqui e da iFood Express. Posso falar rapidinho?',
        body: 'Entao, seu pedido ja ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?',
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  },
  'clinicas': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar resultados de exames',
    scripts: [
      {
        title: 'Script Natural - Clinica',
        greeting: 'Ola, {saudacao}? Aqui e do Laboratorio VidaSaude, de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que seus exames estao prontos e ja estao a caminho. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos, e pronto - la voce ve onde ta o entregador, o horario que chega, e recebe aviso quando tiver perto. E so 3 reais pra ativar, bem baratinho. Posso te ajudar a baixar? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Um abraco!'
      },
      {
        title: 'Script Conversa - Clinica',
        greeting: 'Oi, {saudacao}? Aqui e do Laboratorio VidaSaude. Posso falar 2 minutos?',
        body: 'Entao, seus exames estao prontos e ja sairam pra entrega. Eu ligo pra todos os clientes porque tem uma coisa que facilita muito: a gente tem um app que voce ve em tempo real onde ta o entregador. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. A maioria dos pacientes que usa, nao quer mais saber de ligar perguntando nada. Quer que eu te mande o link pelo WhatsApp?',
        closing: 'Beleza, te mando o link. E so 3 reais e voce fica tranquilo. Qualquer duvida, so me chamar!'
      }
    ]
  },
  'imobiliarias': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas de documentos',
    scripts: [
      {
        title: 'Script Natural - Imobiliaria',
        greeting: 'Ola, {saudacao}? Aqui e da DocsExpress, transportadora de documentos de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que seus documentos estao a caminho ja. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos por SMS, e pronto - la voce ve o entregador no mapa, sabe o horario certo que chega, e ainda recebe um aviso no celular quando tiver perto. E so 3 reais pra ativar, uma mixaria. Posso te ajudar a baixar agora? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Um abraco!'
      },
      {
        title: 'Script Conversa - Imobiliaria',
        greeting: 'Oi, {saudacao}? Aqui e da DocsExpress. Posso falar rapidinho?',
        body: 'Entao, seus documentos ja sairam e ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?',
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  },
  'academias': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Academia',
        greeting: 'Ola, {saudacao}? Aqui e da FitStore, loja de suplementos de Sao Paulo. Tudo certo?',
        body: 'Ligando pra te avisar que seu pedido ja saiu e ta a caminho. Olha, pra voce nao ficar olhando o relogio, a gente tem um app que voce ve o entregador no mapa em tempo real. Voce baixa, coloca o codigo do pedido, e la mostra tudinho - onde ta o cara, quanto tempo falta, e avisa quando tiver perto. E so 3 reais pra ativar, bem baratinho. Posso te ajudar a baixar? Leva 2 minutinhos no maximo.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem ficar na duvida. Se precisar de qualquer coisa, so me chamar. Treino bom!'
      },
      {
        title: 'Script Conversa - Academia',
        greeting: 'Oi, {saudacao}? Aqui e da FitStore. Posso falar rapidinho?',
        body: 'Entao, seu pedido ja ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?',
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  },
  'padarias': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Padaria',
        greeting: 'Ola, {saudacao}? Aqui e da Padaria PaoCerto, de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que seu pedido ja saiu e ta a caminho. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos, e pronto - la voce ve onde ta o entregador, o horario que chega, e recebe aviso quando tiver perto. E so 3 reais pra ativar, bem baratinho. Posso te ajudar a baixar? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Bom apetite!'
      },
      {
        title: 'Script Conversa - Padaria',
        greeting: 'Oi, {saudacao}? Aqui e da PaoCerto. Posso falar 2 minutos?',
        body: 'Entao, seu pedido ja ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. A maioria dos clientes que usa, nao quer mais saber de ligar perguntando nada. Quer que eu te mande o link pelo WhatsApp?',
        closing: 'Beleza, te mando o link. E so 3 reais e voce fica tranquilo. Qualquer duvida, so me chamar!'
      }
    ]
  },
  'pet': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Pet Shop',
        greeting: 'Ola, {saudacao}? Aqui e da PetLove, loja de produtos pet de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que seu pedido de racao ja saiu e ta a caminho. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos, e pronto - la voce ve onde ta o entregador, o horario que chega, e recebe aviso quando tiver perto. E so 3 reais pra ativar, bem baratinho. Posso te ajudar a baixar? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Um abraco pros pets!'
      },
      {
        title: 'Script Conversa - Pet Shop',
        greeting: 'Oi, {saudacao}? Aqui e da PetLove. Posso falar rapidinho?',
        body: 'Entao, seu pedido ja ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?',
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  },
  'saloes': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Salao',
        greeting: 'Ola, {saudacao}? Aqui e da BelezaOnline, loja de produtos de beleza de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que seu pedido ja saiu e ta a caminho. Olha, pra voce nao ficar olhando o relogio, a gente tem um app que voce ve o entregador no mapa em tempo real. Voce baixa, coloca o codigo do pedido, e la mostra tudinho - onde ta o cara, quanto tempo falta, e avisa quando tiver perto. E so 3 reais pra ativar, bem baratinho. Posso te ajudar a baixar? Leva 2 minutinhos no maximo.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem ficar na duvida. Se precisar de qualquer coisa, so me chamar. Fica bonita!'
      },
      {
        title: 'Script Conversa - Salao',
        greeting: 'Oi, {saudacao}? Aqui e da BelezaOnline. Posso falar 2 minutos?',
        body: 'Entao, seu pedido ja ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. A maioria dos clientes que usa, nao quer mais saber de ligar perguntando nada. Quer que eu te mande o link pelo WhatsApp?',
        closing: 'Beleza, te mando o link. E so 3 reais e voce fica tranquilo. Qualquer duvida, so me chamar!'
      }
    ]
  }
};

// PF Categories - Same natural approach
const PF_SCRIPTS = {
  'profissionais': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Profissional',
        greeting: 'Ola, {saudacao}? Aqui e da SpeedLog, transportadora de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que sua entrega ta a caminho ja. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos por SMS, e pronto - la voce ve o entregador no mapa, sabe o horario certo que chega, e ainda recebe um aviso no celular quando tiver perto. E so 3 reais pra ativar, uma mixaria. Posso te ajudar a baixar agora? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Um abraco!'
      },
      {
        title: 'Script Conversa - Profissional',
        greeting: 'Oi, {saudacao}? Aqui e da SpeedLog. Posso falar rapidinho?',
        body: 'Entao, sua entrega ja saiu e ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?',
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  },
  'prestadores': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Prestador',
        greeting: 'Ola, {saudacao}? Aqui e da SpeedLog, transportadora de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que sua entrega ja saiu e ta indo ate voce. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente tem um app que voce ve em tempo real onde ta o entregador. Voce baixa, coloca o codigo que te mandamos, e pronto - la voce ve o mapa, o horario que chega, e recebe aviso quando tiver perto. E so 3 reais pra ativar, bem baratinho. Posso te ajudar a baixar? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Bom dia!'
      },
      {
        title: 'Script Conversa - Prestador',
        greeting: 'Oi, {saudacao}? Aqui e da SpeedLog. Posso falar 2 minutos?',
        body: 'Entao, sua entrega ja ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. A maioria dos clientes que usa, nao quer mais saber de ligar perguntando nada. Quer que eu te mande o link pelo WhatsApp?',
        closing: 'Beleza, te mando o link. E so 3 reais e voce fica tranquilo. Qualquer duvida, so me chamar!'
      }
    ]
  },
  'comerciantes': {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: 'Script Natural - Comerciante',
        greeting: 'Ola, {saudacao}? Aqui e da SpeedLog, transportadora de Sao Paulo. Tudo bem?',
        body: 'Ligando pra te avisar que sua entrega ta a caminho ja. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos por SMS, e pronto - la voce ve o entregador no mapa, sabe o horario certo que chega, e ainda recebe um aviso no celular quando tiver perto. E so 3 reais pra ativar, uma mixaria. Posso te ajudar a baixar agora? Leva 2 minutinhos.',
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Um abraco!'
      },
      {
        title: 'Script Conversa - Comerciante',
        greeting: 'Oi, {saudacao}? Aqui e da SpeedLog. Posso falar rapidinho?',
        body: 'Entao, sua entrega ja saiu e ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?',
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  }
};

// Generic script
function getGenericScripts(keyword) {
  return {
    appName: 'RastrearEntrega',
    appDescription: 'app para acompanhar entregas',
    scripts: [
      {
        title: `Script Natural - ${keyword}`,
        greeting: `Ola, {saudacao}? Aqui e da SpeedLog, transportadora de Sao Paulo. Tudo bem?`,
        body: `Ligando pra te avisar que sua entrega ta a caminho ja. Olha, pra voce nao ficar na duvida de quando vai chegar, a gente criou um app bem simples. Voce baixa, coloca o codigo que te mandamos por SMS, e pronto - la voce ve o entregador no mapa, sabe o horario certo que chega, e ainda recebe um aviso no celular quando tiver perto. E so 3 reais pra ativar, uma mixaria. Posso te ajudar a baixar agora? Leva 2 minutinhos.`,
        closing: 'Olha, e so 3 reais e voce fica sabendo de tudo, sem precisar ficar ligando perguntando. Se precisar de qualquer coisa, so me chamar. Um abraco!'
      },
      {
        title: `Script Conversa - ${keyword}`,
        greeting: `Oi, {saudacao}? Aqui e da SpeedLog. Posso falar rapidinho?`,
        body: `Entao, sua entrega ja saiu e ta indo ate voce. Eu ligo porque tem uma coisa que facilita: a gente tem um app que voce ve onde ta o entregador em tempo real. E bem tranquilo, voce baixa, coloca o codigo, e la mostra tudinho. E so 3 reais pra ativar. Muita gente que usa, fala que nao quer mais saber de ficar ligando perguntando. Quer que eu te mande o link?`,
        closing: 'Beleza, te mando. E so 3 reais e voce fica sabendo de tudo. Qualquer coisa, so me chamar!'
      }
    ]
  };
}

// GET /api/scripts/:keyword
router.get('/:keyword', (req, res) => {
  const { keyword } = req.params;
  const normalizedKeyword = keyword.toLowerCase().trim();

  let niche = PF_SCRIPTS[normalizedKeyword];

  if (!niche) {
    for (const [key, value] of Object.entries(SCRIPTS)) {
      if (normalizedKeyword.includes(key) || key.includes(normalizedKeyword)) {
        niche = value;
        break;
      }
    }
  }

  if (!niche) {
    niche = getGenericScripts(keyword);
  }

  const processScript = (script) => {
    const greetings = ['bom dia', 'boa tarde', 'boa noite'];
    const saudacao = greetings[Math.floor(Math.random() * greetings.length)];
    return {
      ...script,
      greeting: script.greeting.replace('{saudacao}', saudacao),
      body: script.body,
      closing: script.closing,
    };
  };

  const scripts = niche.scripts.map(script => processScript(script));

  res.json({
    keyword,
    appName: niche.appName,
    appDescription: niche.appDescription,
    scripts,
    total: scripts.length,
  });
});

// POST /api/scripts/custom
router.post('/custom', (req, res) => {
  const { keyword, tone } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword e obrigatoria' });
  }

  const niche = PF_SCRIPTS[keyword.toLowerCase()] || SCRIPTS[keyword.toLowerCase()] || getGenericScripts(keyword);

  const customScripts = niche.scripts.map((script) => ({
    ...script,
    title: `${script.title} - Personalizado`,
    greeting: script.greeting.replace('{saudacao}', 'bom dia'),
    tone: tone || 'natural',
  }));

  res.json({
    keyword,
    scripts: customScripts,
    total: customScripts.length,
  });
});

module.exports = router;
