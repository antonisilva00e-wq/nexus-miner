let automationInterval = null;

function saveAutomationSettings() {
    const pk = document.getElementById('automation-private-key').value;
    const phoneId = document.getElementById('automation-phone-id').value;
    const agentId = document.getElementById('automation-agent-id').value;
    
    if (pk) localStorage.setItem('automation_private_key', pk);
    if (phoneId) localStorage.setItem('automation_phone_id', phoneId);
    if (agentId) localStorage.setItem('automation_agent_id', agentId);
}

function loadAutomationSettings() {
    document.getElementById('automation-private-key').value = localStorage.getItem('automation_private_key') || '';
    document.getElementById('automation-phone-id').value = localStorage.getItem('automation_phone_id') || '';
    document.getElementById('automation-agent-id').value = localStorage.getItem('automation_agent_id') || '';
}

// Chamar ao carregar
document.addEventListener('DOMContentLoaded', loadAutomationSettings);

async function startAutomation() {
    const privateKey = document.getElementById('automation-private-key').value.trim();
    const phoneId = document.getElementById('automation-phone-id').value.trim();
    const agentId = document.getElementById('automation-agent-id').value.trim();
    const listRaw = document.getElementById('automation-phone-list').value.trim();

    if (!privateKey || !phoneId || !agentId || !listRaw) {
        return showToast('Por favor, preencha todos os campos obrigatórios!', 'danger');
    }

    // Processar telefones
    const phones = listRaw.split('\n')
        .map(p => p.trim().replace(/\s+/g, ''))
        .filter(p => p.length > 8);

    if (phones.length === 0) {
        return showToast('Nenhum número de telefone válido encontrado.', 'danger');
    }

    saveAutomationSettings();

    try {
        const response = await fetch('/api/vapi/outbound/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                privateKey,
                phoneNumberId: phoneId,
                agentId,
                phones
            })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Erro ao iniciar campanha');

        showToast('Campanha iniciada com sucesso!', 'success');
        
        document.getElementById('btn-start-automation').style.display = 'none';
        document.getElementById('btn-stop-automation').style.display = 'flex';
        
        pollAutomationStatus();

    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function stopAutomation() {
    try {
        await fetch('/api/vapi/outbound/stop', { method: 'POST' });
        showToast('Campanha interrompida.', 'info');
        
        document.getElementById('btn-start-automation').style.display = 'flex';
        document.getElementById('btn-stop-automation').style.display = 'none';
        
        if (automationInterval) clearInterval(automationInterval);
        fetchAutomationStatus(); // Atualiza a tabela uma última vez
    } catch (err) {
        showToast('Erro ao parar campanha', 'danger');
    }
}

function pollAutomationStatus() {
    if (automationInterval) clearInterval(automationInterval);
    fetchAutomationStatus();
    automationInterval = setInterval(fetchAutomationStatus, 3000);
}

async function fetchAutomationStatus() {
    try {
        const response = await fetch('/api/vapi/outbound/status');
        const data = await response.json();
        
        if (data.active) {
            document.getElementById('btn-start-automation').style.display = 'none';
            document.getElementById('btn-stop-automation').style.display = 'flex';
        } else {
            document.getElementById('btn-start-automation').style.display = 'flex';
            document.getElementById('btn-stop-automation').style.display = 'none';
            if (automationInterval) clearInterval(automationInterval);
        }

        const tbody = document.getElementById('automation-table-body');
        if (!data.queue || data.queue.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-secondary">Nenhuma campanha em andamento.</td></tr>';
            return;
        }

        tbody.innerHTML = data.queue.map(item => {
            let statusBadge = '';
            switch(item.status) {
                case 'queued': statusBadge = '<span style="color: #94a3b8;"><i data-lucide="clock" style="width:14px; margin-right:4px;"></i>Na fila</span>'; break;
                case 'calling': statusBadge = '<span style="color: #3b82f6;"><i data-lucide="phone-outgoing" style="width:14px; margin-right:4px;"></i>Chamando...</span>'; break;
                case 'completed': statusBadge = '<span style="color: #22c55e;"><i data-lucide="check-circle" style="width:14px; margin-right:4px;"></i>Concluído</span>'; break;
                case 'failed': statusBadge = '<span style="color: #ef4444;"><i data-lucide="x-circle" style="width:14px; margin-right:4px;"></i>Falhou</span>'; break;
                default: statusBadge = item.status;
            }
            return `
                <tr>
                    <td>${item.phone}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');
        if (window.lucide) { lucide.createIcons(); }
    } catch (err) {
        console.error('Erro ao buscar status:', err);
    }
}
