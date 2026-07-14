// PDF Export — generate branded reports
const PDFExport = {
  defaultColors: {
    primary: [99, 102, 241],
    secondary: [139, 92, 246],
    success: [16, 185, 129],
    warning: [245, 158, 11],
    danger: [244, 63, 94],
    text: [30, 30, 50],
    textLight: [120, 120, 150],
    bg: [248, 249, 252]
  },

  async generateDashboardPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const c = this.defaultColors;
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(...c.primary);
    doc.roundedRect(0, 0, w, 45, 0, 0, 'F');
    doc.setFillColor(...c.secondary);
    doc.roundedRect(0, 40, w, 5, 0, 0, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('NEXUS MINER', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Dashboard — ' + new Date().toLocaleDateString('pt-BR'), 15, 28);
    doc.setFontSize(8);
    doc.text('B2B Lead Mining & CRM Platform', 15, 35);

    // KPI Section
    let y = 55;
    doc.setTextColor(...c.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Principais', 15, y);
    y += 10;

    const kpis = [
      { label: 'Total de Leads', value: String(data.totalLeads || 0), icon: '🎯', color: c.primary },
      { label: 'Taxa de Conversão', value: (data.conversionRate || 0) + '%', icon: '📈', color: c.success },
      { label: 'Receita Mensal', value: 'R$ ' + (data.mrr || 0).toLocaleString('pt-BR'), icon: '💰', color: c.success },
      { label: 'Clientes Ativos', value: String(data.activeClients || 0), icon: '👥', color: c.warning },
      { label: 'Pipeline', value: String(data.totalPipeline || 0), icon: '🔄', color: c.secondary },
      { label: 'Leads Novos', value: String(data.newLeadsPeriod || 0), icon: '✨', color: c.primary }
    ];

    kpis.forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 15 + col * 62;
      const ky = y + row * 25;

      doc.setFillColor(245, 245, 250);
      doc.roundedRect(x, ky, 58, 22, 3, 3, 'F');
      doc.setFillColor(...kpi.color);
      doc.roundedRect(x, ky, 4, 22, 2, 0, 'F');

      doc.setTextColor(...c.text);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + 10, ky + 10);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...c.textLight);
      doc.text(kpi.label, x + 10, ky + 16);
    });

    y += 55;

    // Pipeline Section
    doc.setTextColor(...c.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Pipeline de Vendas', 15, y);
    y += 10;

    if (data.pipeline && data.pipeline.length > 0) {
      const maxCount = Math.max(...data.pipeline.map(p => p.count));
      data.pipeline.forEach((p, i) => {
        const barW = maxCount > 0 ? (p.count / maxCount) * 120 : 0;
        const colors = { leads: c.primary, contato: [34, 211, 238], proposta: c.warning, fechado: c.success, perdido: c.danger };
        const bc = colors[p.pipeline_stage] || c.primary;

        doc.setFillColor(240, 240, 245);
        doc.roundedRect(15, y, 120, 8, 2, 2, 'F');
        doc.setFillColor(...bc);
        doc.roundedRect(15, y, Math.max(barW, 2), 8, 2, 2, 'F');

        doc.setTextColor(...c.text);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(p.pipeline_stage.toUpperCase(), 140, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.text(String(p.count), 165, y + 5);
        y += 12;
      });
    }

    y += 10;

    // Footer
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(0, h - 20, w, 20, 0, 0, 'F');
    doc.setTextColor(...c.textLight);
    doc.setFontSize(7);
    doc.text('Gerado por Nexus Miner — ' + new Date().toLocaleString('pt-BR'), 15, h - 10);
    doc.text('nexusminer.com.br', w - 15, h - 10, { align: 'right' });

    doc.save('nexus-miner-dashboard-' + new Date().toISOString().slice(0, 10) + '.pdf');
    showToast('PDF exportado com sucesso!', 'success');
  },

  async generateLeadsPDF(leads) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const c = this.defaultColors;
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(...c.primary);
    doc.roundedRect(0, 0, w, 30, 0, 0, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('NEXUS MINER — Lista de Leads', 15, 15);
    doc.setFontSize(8);
    doc.text(`${leads.length} leads • ${new Date().toLocaleDateString('pt-BR')}`, 15, 23);

    // Table header
    let y = 40;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(10, y - 5, w - 20, 10, 2, 2, 'F');
    doc.setTextColor(...c.text);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('NOME', 15, y + 1);
    doc.text('CNPJ', 70, y + 1);
    doc.text('CIDADE', 110, y + 1);
    doc.text('TELEFONE', 145, y + 1);
    doc.text('FONTE', 180, y + 1);
    doc.text('ESTÁGIO', 210, y + 1);
    y += 12;

    // Table rows
    doc.setFont('helvetica', 'normal');
    leads.slice(0, 50).forEach((lead, i) => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 255);
        doc.rect(10, y - 4, w - 20, 8, 'F');
      }
      doc.setTextColor(...c.text);
      doc.setFontSize(7);
      doc.text(String(lead.name || '').substring(0, 30), 15, y);
      doc.text(String(lead.cnpj || '-'), 70, y);
      doc.text(String(lead.city || '-'), 110, y);
      doc.text(String(lead.phone || '-'), 145, y);
      doc.text(String(lead.source || '-'), 180, y);
      doc.text(String(lead.pipeline_stage || 'leads'), 210, y);
      y += 8;
    });

    doc.save('nexus-miner-leads-' + new Date().toISOString().slice(0, 10) + '.pdf');
    showToast('PDF de leads exportado!', 'success');
  }
};
