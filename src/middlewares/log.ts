import moment from 'jalali-moment';
import fs from 'fs';
import path from 'path';
import { isEmpty, jwtDecode } from '../utils/funs';

const log = async (req, res, next) => {
  const logData = {
    ipAddress: req.ip || req.socket.remoteAddress,
    pathname: req.originalUrl,
    userAgent: req.get('User-Agent'),
    date: moment().format('jYYYY/jMM/jDD'),
    time: moment().format('HH:mm'),
    method: req.method,
    data: null,
    userId: null,
  };

  if (!isEmpty(req.body)) {
    logData.data = JSON.stringify(req.body);
  }

  if (req.headers.authorization) {
    const userId = jwtDecode(req.headers.authorization);
    if (userId != -1) {
      logData.userId = userId;
    }
  }

  try {
    // Define log file path
    const logDir = path.join(__dirname, '../logs');
    const logFile = path.join(logDir, `access-${moment().format('jYYYY-jMM-jDD')}.log`);

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Format log entry
    const logEntry = `${JSON.stringify(logData)}\n`;

    // Append to log file
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (e) {
    console.log('Error writing log:', e);
  }

  next();
};

export default log;