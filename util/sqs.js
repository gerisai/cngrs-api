import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import logger from './logging.js';
import { sqsUrl } from './constants.js';

const client = new SQSClient({});

const messageAttributes = {
  user: { Name: 'name', Address: 'email', Username: 'username', Password: 'password' },
  person: { Name: 'name', Address: 'email', City: 'city', Room: 'room', PersonId: 'personId' }
}

export async function sendMailMessage(type, resource, groupId) {
  const message = {};
  const msgattributes = {};
  const attributes = messageAttributes[type];
  message.body = `Mail to ${type}`
  msgattributes.MailType = type;

  // Map equivalent fields
  for (const p in attributes) {
    msgattributes[p] = resource[attributes[p]];
  }

  message.attributes = msgattributes;
  await sendMessage(message, resource._id, groupId);
}

export async function sendMessage(message, id, groupId) {
  const input = {
    QueueUrl: sqsUrl,
    MessageBody: message['body'],
    MessageAttributes: Object.fromEntries(Object.entries(message['attributes']).map(([k,v]) =>
      [k, { StringValue: v, DataType: 'String'}]
    )),
    MessageDeduplicationId: id,
    MessageGroupId: groupId || id,
  }

  const command = new SendMessageCommand(input);
  await client.send(command);

  logger.verbose(`Sent message ${id} to SQS`);
}
