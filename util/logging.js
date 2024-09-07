import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    transports: [new winston.transports.Console()],
    format: process.env.NODE_ENV !== 'production' ? 
    winston.format.combine(winston.format.colorize(),winston.format.simple())
    : winston.format.json()
});

export default logger;
