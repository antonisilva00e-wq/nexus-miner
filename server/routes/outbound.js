const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const fetch = require('node-fetch'); // Ensure node-fetch or native fetch is available

// State for the automation queue
let queueState = {
    active: false,
    privateKey: null,
    phoneNumberId: null,
    agentId: null,
    queue: [],
    currentIndex: 0,
    currentCallId: null
};

// Start Automation
router.post('/start', authenticate, async (req, res) => {
    const { privateKey, phoneNumberId, agentId, phones } = req.body;
    
    if (!privateKey || !phoneNumberId || !agentId || !phones || phones.length === 0) {
        return res.status(400).json({ error: 'Dados insuficientes para iniciar campanha' });
    }

    if (queueState.active) {
        return res.status(400).json({ error: 'Ja existe uma campanha em andamento' });
    }

    queueState = {
        active: true,
        privateKey,
        phoneNumberId,
        agentId,
        queue: phones.map(p => ({ phone: p, status: 'queued', callId: null })),
        currentIndex: 0,
        currentCallId: null
    };

    // Start first call
    processNextCall();

    res.json({ success: true, message: 'Campanha iniciada' });
});

// Stop Automation
router.post('/stop', authenticate, (req, res) => {
    queueState.active = false;
    res.json({ success: true, message: 'Campanha interrompida' });
});

// Status of Automation
router.get('/status', authenticate, (req, res) => {
    res.json({
        active: queueState.active,
        queue: queueState.queue
    });
});

async function processNextCall() {
    if (!queueState.active) return;
    
    // Find next queued
    const nextIndex = queueState.queue.findIndex(q => q.status === 'queued');
    if (nextIndex === -1) {
        queueState.active = false; // Finished
        return;
    }

    const currentItem = queueState.queue[nextIndex];
    currentItem.status = 'calling';
    queueState.currentIndex = nextIndex;

    try {
        const payload = {
            assistantId: queueState.agentId,
            phoneNumberId: queueState.phoneNumberId,
            customer: {
                number: currentItem.phone.startsWith('+') ? currentItem.phone : `+${currentItem.phone}`
            }
        };

        const response = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${queueState.privateKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Vapi Outbound] Error starting call:', errBody);
            currentItem.status = 'failed';
            // Wait 5 seconds before trying next if failed
            setTimeout(processNextCall, 5000);
            return;
        }

        const data = await response.json();
        currentItem.callId = data.id;
        queueState.currentCallId = data.id;

        // Vapi is calling. We wait for the webhook to mark it as completed or failed.
        // But as a fallback if the webhook fails, we check status after a while?
        // Or we just let the webhook handle it. For safety, let's poll Vapi or wait a fixed time.
        // We will rely on Webhook to trigger next call.
        console.log(`[Vapi Outbound] Call started to ${currentItem.phone}, Call ID: ${data.id}`);
        
    } catch (err) {
        console.error('[Vapi Outbound] Fetch error:', err);
        currentItem.status = 'failed';
        setTimeout(processNextCall, 5000);
    }
}

// Function to handle webhook callback from Vapi (called from server/index.js)
function handleCallStatusUpdate(callId, status) {
    if (!queueState.active) return;
    
    const item = queueState.queue.find(q => q.callId === callId);
    if (item) {
        if (status === 'ended' || status === 'completed') {
            item.status = 'completed';
            // Start next call after 10 seconds of cooldown
            setTimeout(processNextCall, 10000);
        } else if (status === 'failed') {
            item.status = 'failed';
            setTimeout(processNextCall, 5000);
        }
    }
}

router.handleCallStatusUpdate = handleCallStatusUpdate;
module.exports = router;
