/**
 * Telegram Service — Bot API integration
 *
 * Para usar:
 * 1. Crie um bot com @BotFather no Telegram
 * 2. Copie o token do bot
 * 3. Adicione o bot como ADMIM nos grupos que quer extrair membros
 * 4. Configure o token no painel
 */

const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

class TelegramService {
  constructor() {
    this.bots = new Map(); // botToken -> bot instance
    this.connections = new Map(); // userId -> { botToken, botUsername, connected }
  }

  // Create a bot instance for a user
  createBot(botToken, userId) {
    if (this.bots.has(botToken)) {
      return { ok: true, bot: this.bots.get(botToken) };
    }

    try {
      const bot = new TelegramBot(botToken, { polling: false });
      this.bots.set(botToken, bot);
      this.connections.set(userId, {
        botToken,
        connected: true,
        connectedAt: new Date().toISOString()
      });
      return { ok: true, bot };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Get bot info
  async getBotInfo(botToken) {
    return new Promise((resolve) => {
      const url = `https://api.telegram.org/bot${botToken}/getMe`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ ok: json.ok, result: json.result });
          } catch {
            resolve({ ok: false, error: 'Token inválido' });
          }
        });
      }).on('error', (err) => resolve({ ok: false, error: err.message }));
    });
  }

  // Get groups where bot is admin
  async getBotGroups(botToken) {
    return new Promise((resolve) => {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const groups = new Map();
            if (json.ok && json.result) {
              json.result.forEach(update => {
                const chat = update.message?.chat || update.my_chat_member?.chat;
                if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
                  groups.set(chat.id, {
                    id: chat.id,
                    name: chat.title,
                    type: chat.type,
                    memberCount: chat.member_count || 0
                  });
                }
              });
            }
            resolve({ ok: true, groups: Array.from(groups.values()) });
          } catch {
            resolve({ ok: false, error: 'Erro ao buscar grupos' });
          }
        });
      }).on('error', (err) => resolve({ ok: false, error: err.message }));
    });
  }

  // Get members of a group
  async getGroupMembers(botToken, chatId, limit = 200) {
    return new Promise((resolve) => {
      // Use getChatMember for each member via exportChatInviteLink or getMembers
      // Note: Bot API has limited ability to list all members
      // We use getUpdates + chat members from recent messages

      const url = `https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${chatId}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          try {
            const countJson = JSON.parse(data);
            if (!countJson.ok) {
              resolve({ ok: false, error: 'Não foi possível acessar o grupo. Verifique se o bot é admin.' });
              return;
            }

            // Try to get members via different methods
            const members = await this.fetchMembersViaMessages(botToken, chatId, limit);
            resolve({
              ok: true,
              totalCount: countJson.result,
              members: members,
              note: members.length < countJson.result
                ? `Mostrando ${members.length} de ${countJson.result} membros (API limitada)`
                : `${members.length} membros encontrados`
            });
          } catch (err) {
            resolve({ ok: false, error: err.message });
          }
        });
      }).on('error', (err) => resolve({ ok: false, error: err.message }));
    });
  }

  // Fetch members from recent messages (Bot API limitation workaround)
  async fetchMembersViaMessages(botToken, chatId, limit) {
    const members = new Map();

    return new Promise((resolve) => {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.ok && json.result) {
              json.result.forEach(update => {
                const msg = update.message || update.channel_post;
                if (msg && msg.chat && String(msg.chat.id) === String(chatId)) {
                  if (msg.from) {
                    members.set(msg.from.id, {
                      id: msg.from.id,
                      firstName: msg.from.first_name || '',
                      lastName: msg.from.last_name || '',
                      username: msg.from.username || '',
                      fullName: `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim()
                    });
                  }
                  // Also check sender_chat for channels
                  if (msg.sender_chat) {
                    members.set(msg.sender_chat.id, {
                      id: msg.sender_chat.id,
                      firstName: msg.sender_chat.title || '',
                      lastName: '',
                      username: msg.sender_chat.username || '',
                      fullName: msg.sender_chat.title || '',
                      isChannel: true
                    });
                  }
                }
              });
            }
            resolve(Array.from(members.values()).slice(0, limit));
          } catch {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  // Search public groups by keyword
  async searchGroups(query) {
    return new Promise((resolve) => {
      // Telegram doesn't have a public search API for groups
      // This is a placeholder for future implementation
      resolve({
        ok: true,
        message: 'Para encontrar grupos, pesquise no Telegram por palavras-chave do seu nicho e adicione o bot como admin.',
        suggestions: this.getNicheSuggestions(query)
      });
    });
  }

  // Get niche-based group suggestions
  getNicheSuggestions(niche) {
    const niches = {
      'marketing': ['Marketing Digital', 'Tráfego Pago', 'SEO', 'Content Marketing', 'Social Media'],
      'vendas': ['Vendas B2B', 'Cold Outreach', 'SaaS Brasil', 'Empreendedores', 'Negócios'],
      'tecnologia': ['Programação', 'Desenvolvimento Web', 'Startup', 'Tech Brasil', 'IA'],
      'financeiro': ['Investimentos', 'Criptomoedas', 'Renda Extra', 'Finanças Pessoais'],
      'saude': ['Fitness', 'Nutrição', 'Bem-estar', 'Saúde Mental'],
      'educacao': ['Cursos Online', 'Mentoria', 'Coaching', 'EAD'],
      'imobiliario': ['Imóveis', 'Corretores', 'Investimento Imobiliário'],
      'ecommerce': ['Dropshipping', 'Shopify Brasil', 'E-commerce']
    };
    return niches[niche] || niches['vendas'];
  }

  // Export members as CSV
  exportCSV(members, groupName) {
    const header = 'ID,Username,Primeiro Nome,Último Nome,Nome Completo\n';
    const rows = members.map(m =>
      `${m.id},${m.username || ''},${m.firstName || ''},${m.lastName || ''},${m.fullName || ''}`
    ).join('\n');
    return header + rows;
  }

  // Disconnect bot
  disconnect(userId) {
    const conn = this.connections.get(userId);
    if (conn) {
      this.bots.delete(conn.botToken);
      this.connections.delete(userId);
    }
  }
}

module.exports = new TelegramService();
