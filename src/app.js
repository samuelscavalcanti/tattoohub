const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (isProd) app.set('trust proxy', 1); // atrás de proxy/HTTPS (Render, Railway, Nginx...)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'data:'],
        imgSrc: ["'self'", 'data:', 'https://ui-avatars.com', 'https://api.qrserver.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(
  cors({
    origin: (process.env.FRONT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
    credentials: true, // necessário para o cookie de sessão viajar
  })
);
app.use(express.json({ limit: '3mb' })); // avatar em base64

app.use(
  session({
    name: 'tattoohub.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 60 * 60 * 24 * 7 }),
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: process.env.COOKIE_SAMESITE || 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use('/api', routes);
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
