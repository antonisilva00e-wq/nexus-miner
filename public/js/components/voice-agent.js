// Voice AI Agent component — Holographic Voice Helper
const VoiceAgent = {
  recognition: null,
  isListening: false,
  isSpeaking: false,
  bubbleTimeout: null,
  mode: 'dashboard', // 'dashboard' or 'sales'

  init() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[VoiceAgent] Web Speech API (SpeechRecognition) nao suportada neste navegador.');
      return;
    }

    // Render Widget in DOM
    this.render();

    // Init Speech Recognition
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false; // Default for dashboard

    // Speech Recognition Handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateBtnState('listening');
      this.updateStatus(this.mode === 'sales' ? 'Ouvindo Ligação...' : 'Estou ouvindo...');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (!this.isSpeaking && !document.getElementById('voice-btn').classList.contains('thinking')) {
        this.updateBtnState('idle');
        this.updateStatus('Clique para falar');
        
        // Auto-restart if in sales mode and not explicitly stopped or speaking
        if (this.mode === 'sales' && !this.isSpeaking) {
           try { this.recognition.start(); } catch(e) {}
        }
      }
    };

    this.recognition.onerror = (e) => {
      console.error('[VoiceAgent] Erro de reconhecimento:', e.error);
      this.isListening = false;
      this.updateBtnState('idle');
      this.updateStatus('Clique para falar');
      if (e.error === 'not-allowed') {
        showToast('Permissão de microfone negada.', 'warning');
      }
    };

    this.recognition.onresult = async (event) => {
      // Get the last transcribed text in continuous mode
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript;
      if (!transcript) return;

      // Show what user said in bubble
      this.showBubble();
      this.setUserSpeech(transcript);
      this.updateBtnState('thinking');
      this.updateStatus('Processando...');

      // Send to Backend
      try {
        const token = localStorage.getItem('nexus_access_token');
        const res = await fetch('/api/voice-agent/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ message: transcript, mode: this.mode })
        });

        if (!res.ok) throw new Error('Erro na conexao com o servidor');
        const data = await res.json();
        
        // Show AI response and speak it
        this.setAISpeech(data.response);
        this.speak(data.response);
      } catch (err) {
        console.error('[VoiceAgent] Chat Error:', err);
        this.setAISpeech('Desculpe, ocorreu um erro de conexão.');
        this.speak('Desculpe, erro de conexão.');
      }
    };
  },

  render() {
    if (document.getElementById('voice-agent-root')) return;

    const root = document.createElement('div');
    root.id = 'voice-agent-root';
    root.className = 'voice-agent-wrapper';
    root.innerHTML = `
      <!-- Speech Bubble -->
      <div id="voice-bubble" class="voice-bubble">
        <div class="voice-status-text">
          <i data-lucide="message-square" style="width:12px;height:12px;color:var(--accent-primary);"></i>
          <span id="voice-status">Assistente de Voz</span>
        </div>
        
        <!-- Mode Switcher -->
        <div class="voice-mode-switcher" onclick="VoiceAgent.toggleMode()" title="Mudar modo do Agente">
          <span id="voice-mode-label">Modo: Painel</span>
          <i data-lucide="refresh-cw" style="width:12px;height:12px"></i>
        </div>

        <div id="voice-user-speech" class="voice-speech-row voice-speech-user" style="display:none;"></div>
        <div id="voice-ai-speech" class="voice-speech-row voice-speech-ai" style="display:none;"></div>
      </div>

      <!-- Floating Button -->
      <button id="voice-btn" class="voice-agent-btn" onclick="VoiceAgent.toggleMic()" title="Falar com Copiloto de Voz">
        <i data-lucide="mic" id="voice-mic-icon"></i>
        <div class="voice-waves-container">
          <div class="voice-wave"></div>
          <div class="voice-wave"></div>
          <div class="voice-wave"></div>
        </div>
      </button>
    `;

    document.body.appendChild(root);
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
  },

  toggleMode() {
    this.mode = this.mode === 'dashboard' ? 'sales' : 'dashboard';
    const label = document.getElementById('voice-mode-label');
    if (label) label.textContent = this.mode === 'sales' ? 'Modo: Vendedor (Ao Vivo)' : 'Modo: Painel';
    
    // Change bubble style
    const bubble = document.getElementById('voice-bubble');
    if (bubble) {
      if (this.mode === 'sales') bubble.classList.add('sales-mode');
      else bubble.classList.remove('sales-mode');
    }
    
    // Restart recognition with new continuous setting if listening
    const wasListening = this.isListening;
    if (wasListening) this.recognition.stop();
    this.recognition.continuous = this.mode === 'sales';
    if (wasListening) setTimeout(() => this.recognition.start(), 300);

    // Give visual feedback
    this.showBubble();
    this.setAISpeech(this.mode === 'sales' 
      ? 'Modo Vendedor ativado. Vou ouvir a ligação e seguir seus roteiros de venda!' 
      : 'Modo Painel ativado. O que quer saber sobre suas métricas?');
  },

  toggleMic() {
    // Stop speaking if currently active
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }

    if (this.isListening) {
      this.recognition.stop();
      // Force exit sales auto-restart logic
      this.isListening = false; 
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('[VoiceAgent] Start error:', e);
      }
    }
  },

  updateBtnState(state) {
    const btn = document.getElementById('voice-btn');
    const icon = document.getElementById('voice-mic-icon');
    if (!btn || !icon) return;

    btn.className = 'voice-agent-btn';
    btn.classList.add(state);
    
    if (this.mode === 'sales') btn.classList.add('sales-active');

    if (state === 'listening') {
      icon.innerHTML = '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/>';
    } else if (state === 'thinking') {
      icon.innerHTML = '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>';
      if (typeof lucide !== 'undefined') {
        icon.setAttribute('data-lucide', 'loader-2');
        lucide.createIcons();
      }
    } else {
      icon.innerHTML = '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/>';
      if (typeof lucide !== 'undefined') {
        icon.setAttribute('data-lucide', 'mic');
        lucide.createIcons();
      }
    }
  },

  updateStatus(text) {
    const status = document.getElementById('voice-status');
    if (status) status.textContent = text;
  },

  showBubble() {
    const bubble = document.getElementById('voice-bubble');
    if (!bubble) return;
    bubble.classList.add('active');
    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
      this.hideBubble();
    }, 15000);
  },

  hideBubble() {
    const bubble = document.getElementById('voice-bubble');
    if (bubble) bubble.classList.remove('active');
  },

  setUserSpeech(text) {
    const el = document.getElementById('voice-user-speech');
    if (el) {
      el.textContent = text;
      el.style.display = 'block';
    }
  },

  setAISpeech(text) {
    const el = document.getElementById('voice-ai-speech');
    if (el) {
      el.textContent = text;
      el.style.display = 'block';
    }
  },

  speak(text) {
    if (!window.speechSynthesis) return;

    // VERY IMPORTANT: Stop mic while AI speaks to avoid audio loop feedback
    const wasListening = this.isListening;
    if (wasListening) {
      try { this.recognition.stop(); } catch(e) {}
    }

    this.isSpeaking = true;
    this.updateBtnState('thinking');
    this.updateStatus('Falando...');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    
    // Choose best voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateBtnState('idle');
      this.updateStatus('Clique para falar');
      
      // Auto-resume listening if it was listening and mode is sales
      if (wasListening && this.mode === 'sales') {
         setTimeout(() => {
           try { this.recognition.start(); } catch(e) {}
         }, 300);
      }
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.updateBtnState('idle');
      this.updateStatus('Clique para falar');
    };

    window.speechSynthesis.speak(utterance);
  }
};

// Initialization will be called by App.showApp()
