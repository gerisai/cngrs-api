import aws from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import templateMail from './mailTemplates.js';
import logger from '../util/logging.js';

const ses = new aws.SES({});

const transporter = nodemailer.createTransport({
  SES: { ses, aws },
});

export function sendMail (type, toAddress, values) {
  const { subject, template } = templateMail(type,values);
  transporter.sendMail(
    {
      from: process.env.OUT_MAIL,
      to: toAddress,
      subject: subject,
      html: template,
    },
    (err) => {
      if (err) {
        logger.error(err.message);
        throw new Error(err);
      };
      logger.info(`Sent ${type} email to ${toAddress}`);
    }
  );
}
