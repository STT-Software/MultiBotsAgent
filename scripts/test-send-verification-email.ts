/**
 * Script de prueba para enviar un email de verificación via Elastic Email.
 *
 * Uso:
 *   npx tsx scripts/test-send-verification-email.ts
 *
 * Requiere las siguientes variables de entorno (o las toma de SST dev):
 *   ELASTIC_EMAIL_API_KEY
 *   ELASTIC_EMAIL_FROM_EMAIL
 *   ELASTIC_EMAIL_FROM_NAME
 *   ELASTIC_EMAIL_TEMPLATE_ID
 *   FRONTEND_DOMAIN
 */

const TO_EMAIL = 'jlamos@stt.com.co';
const TEST_USERNAME = 'Jorge';
const TEST_TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

async function main() {
  const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  const fromEmail = process.env.ELASTIC_EMAIL_FROM_EMAIL;
  const fromName = process.env.ELASTIC_EMAIL_FROM_NAME;
  const templateId = process.env.ELASTIC_EMAIL_TEMPLATE_ID || 'MultibotAgents-email-verification';
  const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';

  if (!apiKey) {
    console.error('ERROR: ELASTIC_EMAIL_API_KEY no está configurada.');
    console.error('Ejecuta este script dentro de `sst dev` o exporta la variable manualmente.');
    process.exit(1);
  }

  if (!fromEmail) {
    console.error('ERROR: ELASTIC_EMAIL_FROM_EMAIL no está configurada.');
    process.exit(1);
  }

  const verificationUrl = `${frontendDomain}/verify-email?token=${TEST_TOKEN}`;

  console.log('--- Prueba de envío de email de verificación ---');
  console.log(`To:       ${TO_EMAIL}`);
  console.log(`From:     ${fromName} <${fromEmail}>`);
  console.log(`Template: ${templateId}`);
  console.log(`URL:      ${verificationUrl}`);
  console.log('');

  const payload = {
    Recipients: { To: [TO_EMAIL] },
    Content: {
      From: `${fromName || 'MultiBotAgents'} <${fromEmail}>`,
      TemplateName: templateId,
      Merge: { username: TEST_USERNAME, verification_url: verificationUrl },
    },
  };

  console.log('Enviando (API v4)...');

  const response = await fetch('https://api.elasticemail.com/v4/emails/transactional', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ElasticEmail-ApiKey': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  console.log(`HTTP Status: ${response.status}`);
  console.log(`Response: ${responseText}`);

  try {
    const json = JSON.parse(responseText);
    if (json.TransactionID || json.MessageID) {
      console.log('\n✓ Email enviado exitosamente.');
      console.log(`  Transaction ID: ${json.TransactionID || 'N/A'}`);
      console.log(`  Message ID: ${json.MessageID || 'N/A'}`);
    } else if (json.Error || json.error) {
      console.error('\n✗ Error de Elastic Email:');
      console.error(`  ${json.Error || json.error}`);
    } else {
      console.log('\n? Respuesta inesperada:', JSON.stringify(json, null, 2));
    }
  } catch {
    console.log('\nRespuesta no es JSON válido.');
  }
}

main().catch((err) => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
