// Plano vem de Estudio.plano ('starter' | 'pro'). O limite de perfis inclui o dono.
exports.limitePerfis = (plano) => (plano === 'pro' ? 5 : 1);
