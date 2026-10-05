require('dotenv').config(); // precisa vir antes de carregar o app
process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

if (!process.env.SESSION_SECRET) throw new Error('Defina SESSION_SECRET no .env');
if (!process.env.MONGO_URI) throw new Error('Defina MONGO_URI no .env');

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`TattooHub em http://localhost:${PORT} (API: /api)`)))
  .catch((err) => {
    console.error('Falha ao iniciar:', err);
    process.exit(1);
  });
