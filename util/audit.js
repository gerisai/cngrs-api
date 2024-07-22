import winston from 'winston';

const auditLogger = winston.createLogger({
    level: process.env.AUDIT ? 'audit' : 'noaudit',
    levels: {
      audit: 0
    },
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.colorize({
        colors: {
          audit: 'magenta'
        }
      }),
      winston.format.simple()
    )
});


function auditAction (auditUser, action, resource, resourceName) {
  auditLogger.audit(`${action} ${resource} ${resourceName} by ${auditUser} `);
}

export default auditAction;
