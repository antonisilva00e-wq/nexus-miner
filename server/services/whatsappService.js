const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrBase64 = null;
    this.status = 'disconnected'; // 'disconnected', 'connecting', 'qr', 'connected'
    this.userPhone = '';
    this.userName = '';
    this.profilePic = '';
    
    this.sessionPath = path.join(__dirname, '..', '..', 'data', 'whatsapp');
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  emit(event, data) {
    if (global.__io) {
      global.__io.emit(event, data);
    }
  }

  async start() {
    if (this.status === 'connected' && this.sock) return;
    
    this.status = 'connecting';
    this.qrBase64 = null;
    this.emit('wa_status', { status: this.status });

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }), // Hide heavy logs
      browser: ['Nexus Miner', 'Chrome', '2.0.0']
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.status = 'qr';
        try {
          this.qrBase64 = await QRCode.toDataURL(qr);
          this.emit('wa_qr', { qr: this.qrBase64 });
        } catch (err) {
          console.error('[WhatsApp] Erro gerando QR:', err);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        this.status = 'disconnected';
        this.qrBase64 = null;
        this.emit('wa_status', { status: this.status });

        if (shouldReconnect) {
          console.log('[WhatsApp] Conexão caiu, tentando reconectar...');
          setTimeout(() => this.start(), 5000);
        } else {
          console.log('[WhatsApp] Desconectado permanentemente (Log out).');
          this.clearSession();
        }
      } else if (connection === 'open') {
        console.log('[WhatsApp] Conectado com sucesso!');
        this.status = 'connected';
        this.qrBase64 = null;
        
        try {
          // Get user info
          const jid = this.sock.user.id;
          this.userPhone = jid.split(':')[0];
          this.userName = this.sock.user.name || 'Conta WhatsApp';
          
          try {
            this.profilePic = await this.sock.profilePictureUrl(jid, 'image');
          } catch {
            this.profilePic = '';
          }
        } catch (e) {
          console.error('[WhatsApp] Erro ao obter dados do perfil:', e.message);
        }

        this.emit('wa_status', { 
          status: 'connected', 
          phone: this.userPhone, 
          name: this.userName,
          pic: this.profilePic
        });
      }
    });

    // Handle incoming messages
    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      if (remoteJid.includes('@g.us')) return; // Ignore groups

      // Get text content
      let content = '';
      if (msg.message.conversation) {
        content = msg.message.conversation;
      } else if (msg.message.extendedTextMessage) {
        content = msg.message.extendedTextMessage.text;
      }

      if (content) {
        this.emit('wa_message', {
          id: msg.key.id,
          from: remoteJid.split('@')[0],
          text: content,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async logout() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.status = 'disconnected';
    this.clearSession();
    this.emit('wa_status', { status: 'disconnected' });
  }

  clearSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        fs.mkdirSync(this.sessionPath);
      }
    } catch (e) {
      console.error('[WhatsApp] Erro limpando sessao:', e.message);
    }
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.status === 'qr' ? this.qrBase64 : null,
      user: this.status === 'connected' ? {
        phone: this.userPhone,
        name: this.userName,
        pic: this.profilePic
      } : null
    };
  }

  async sendMessage(to, text) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('WhatsApp não está conectado');
    }
    const jid = `${to}@s.whatsapp.net`;
    return await this.sock.sendMessage(jid, { text });
  }
}

const waService = new WhatsAppService();
module.exports = waService;
