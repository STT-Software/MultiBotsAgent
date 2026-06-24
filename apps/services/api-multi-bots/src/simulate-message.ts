import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const queueUrl = 'https://sqs.us-east-1.amazonaws.com/194951819260/multibotagents-lamos-WhatsAppIncomingQueueQueue-bcctrmnc';
const region = 'us-east-1';

const eventPayload = {
  agentId: '6a17081684826f9c174d2118',
  companyId: '6a17081684826f9c174d2117',
  channelId: '6a16fd646e4988a2ac041ebf',
  conversationId: 'whatsapp_573024883835',
  senderPhoneNumber: '573024883835',
  phoneNumberId: '1137730779422071',
  messageId: `mock-wamid-test-${Date.now()}`,
  messageText: process.argv[2] || '¿Qué es ST&T y a qué se dedica?',
  timestamp: new Date().toISOString(),
};

async function main() {
  console.log('Sending event payload to SQS queue:', queueUrl);
  console.log(JSON.stringify(eventPayload, null, 2));

  // Usará el profile configurado en la variable AWS_PROFILE o las credenciales del sistema
  const sqsClient = new SQSClient({ region });
  try {
    const result = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(eventPayload),
      })
    );
    console.log('Message sent successfully. MessageId:', result.MessageId);
  } catch (err) {
    console.error('Failed to send message to SQS:', err);
  }
}

main();
