const fs = require('fs');
let code = fs.readFileSync('public/js/pages/financial.js', 'utf8');

if (!code.includes('Registrar Venda')) {
  code = code.replace(
    /document\.getElementById\('page-subtitle'\)\.textContent = 'Dashboard financeiro avancado';/,
    \document.getElementById('page-subtitle').textContent = 'Dashboard financeiro avancado';
    
    // Add Register Sale Button
    const header = document.querySelector('.header-actions');
    if (header && !document.getElementById('btn-register-sale')) {
      const btn = document.createElement('button');
      btn.id = 'btn-register-sale';
      btn.className = 'btn-primary';
      btn.innerHTML = '<i data-lucide="plus"></i> Registrar Venda';
      btn.onclick = () => window.FinancialPage.openSaleModal();
      header.appendChild(btn);
    }\
  );
}

if (!code.includes('openSaleModal')) {
  code = code.replace(
    /loadData\(\) \{/,
    \openSaleModal() {
    Modal.show({
      title: 'Registrar Nova Venda',
      body: \\\
        <div class="form-group">
          <label>Valor da Venda (R$)</label>
          <input type="number" id="sale-amount" class="form-control" placeholder="Ex: 297.00" step="0.01">
        </div>
        <div class="form-group" style="margin-top:15px">
          <label>Data</label>
          <input type="date" id="sale-date" class="form-control" value="\\\">
        </div>
      \\\,
      buttons: [
        { text: 'Cancelar', class: 'btn-secondary', onClick: () => Modal.hide() },
        { text: 'Salvar Venda', class: 'btn-primary', onClick: async () => {
          const amount = document.getElementById('sale-amount').value;
          const date = document.getElementById('sale-date').value;
          if (!amount) return showToast('Preencha o valor', 'error');
          
          try {
            const btn = document.querySelector('.modal .btn-primary');
            btn.disabled = true;
            btn.innerHTML = 'Salvando...';
            
            await API.post('/financial/payments', {
              amount: parseFloat(amount),
              payment_date: date,
              notes: 'Venda direta'
            });
            
            Modal.hide();
            showToast('Venda registrada com sucesso!', 'success');
            await window.FinancialPage.loadData();
          } catch(e) {
            showToast('Erro ao salvar venda', 'error');
          }
        }}
      ]
    });
  },

  loadData() {\
  );
}

fs.writeFileSync('public/js/pages/financial.js', code);
console.log('done updating financial UI');
