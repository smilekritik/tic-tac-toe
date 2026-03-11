require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const meRoutes = require('./modules/me/me.routes');
const usersRoutes = require('./modules/users/users.routes');
const gameRoutes = require('./modules/game/game.routes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/users', usersRoutes);

app.use('/api/game', gameRoutes);

app.use(errorHandler);

module.exports = app;
