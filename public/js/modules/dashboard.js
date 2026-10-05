import { get } from '../api.js';
import { $, emptyRow, escapeHTML, money, dateBR, showError } from '../ui.js';

let revenueChart;
let stylesChart;

export async function loadDashboard() {
  try {
    const data = await get('/dashboard');
    $('#kpi-revenue').textContent = money(data.kpis.faturamentoMes);
    $('#kpi-revenue-annual').textContent = money(data.kpis.faturamentoAno);
    $('#kpi-sessions').textContent = data.kpis.sessoesAgendadas;
    $('#kpi-conversion').textContent = `${data.kpis.conversao}%`;

    if (window.Chart) {
      revenueChart?.destroy();
      revenueChart = new Chart($('#revenueChart'), {
        type: 'bar',
        data: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
          datasets: [{
            label: 'Faturamento',
            data: data.receitaMensal,
            backgroundColor: '#DC143C',
            borderRadius: 4,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });

      stylesChart?.destroy();
      stylesChart = new Chart($('#stylesPieChart'), {
        type: 'doughnut',
        data: {
          labels: data.estilos.map((style) => style.estilo),
          datasets: [{ data: data.estilos.map((style) => style.total), backgroundColor: ['#DC143C', '#C5A945', '#1A1A1A', '#2e7d32', '#6284a8', '#9e5474'] }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    $('#dash-agenda-list').innerHTML = data.proximosAgendamentos.length
      ? data.proximosAgendamentos.map((item) => `<tr>
          <td>${escapeHTML(item.cliente)}</td>
          <td>${dateBR(item.data)} ${escapeHTML(item.hora)}</td>
          <td><span class="status ${item.status === 'confirmado' ? 'confirmed' : 'pending'}">${escapeHTML(item.status)}</span></td>
        </tr>`).join('')
      : emptyRow(3, 'Nenhum agendamento futuro.');
  } catch (error) {
    showError(error);
  }
}
