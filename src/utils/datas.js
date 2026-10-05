const pad = (n) => String(n).padStart(2, '0');
// Data local do servidor no formato AAAA-MM-DD (usa o TZ configurado no .env)
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
module.exports = { hojeISO };
