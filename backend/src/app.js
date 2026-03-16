require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const requestContext = require('./middlewares/requestContext.middleware');
const httpLogger = require('./middlewares/httpLogger.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const env = require('./config/env');
const { resolveUploadedFile } = require('./middlewares/upload.middleware');
const docsRoutes = require('./routes/docs.routes');
const authRoutes = require('./modules/auth/auth.routes');
const meRoutes = require('./modules/me/me.routes');
const usersRoutes = require('./modules/users/users.routes');
const gameRoutes = require('./modules/game/game.routes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(requestContext);
app.use(express.json());
app.use(cookieParser());

app.get('/uploads/:filename', (req, res, next) => {
  try {
    const { filePath, mime } = resolveUploadedFile(req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { code: 'UPLOAD_NOT_FOUND' } });
    }

    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

    return res.sendFile(filePath);
  } catch (err) {
    if (err.code === 'UPLOAD_NOT_FOUND') {
      return res.status(404).json({ error: { code: 'UPLOAD_NOT_FOUND' } });
    }
    return next(err);
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(docsRoutes);
app.use('/api', apiLimiter);
app.use(httpLogger);

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/users', usersRoutes);

app.use('/api/game', gameRoutes);

app.use(errorHandler);

module.exports = app;
