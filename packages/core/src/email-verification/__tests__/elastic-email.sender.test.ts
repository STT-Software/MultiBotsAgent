import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ElasticEmailSender,
  ElasticEmailHttpError,
  ElasticEmailNetworkError,
} from '../adapters/elastic-email.sender';
import type { ElasticEmailSenderConfig, SendEmailParams } from '../adapters/elastic-email.sender';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createConfig(overrides: Partial<ElasticEmailSenderConfig> = {}): ElasticEmailSenderConfig {
  return {
    apiKey: 'test-api-key-123',
    fromEmail: 'noreply@plataforma.com',
    fromName: 'Plataforma Agentes',
    templateId: 'template-verification-001',
    ...overrides,
  };
}

function createSendParams(overrides: Partial<SendEmailParams> = {}): SendEmailParams {
  return {
    to: 'user@example.com',
    templateId: 'template-verification-001',
    mergeFields: {
      username: 'Juan',
      verification_url: 'https://app.plataforma.com/verify-email?token=abc123',
    },
    from: { email: 'noreply@plataforma.com', name: 'Plataforma Agentes' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ElasticEmailSender (API v4)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('send - happy path', () => {
    it('should call Elastic Email API v4 transactional endpoint', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"TransactionID":"abc","MessageID":"def"}', { status: 200 }));

      const sender = new ElasticEmailSender(createConfig());
      await sender.send(createSendParams());

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.elasticemail.com/v4/emails/transactional');
      expect(options.method).toBe('POST');
    });

    it('should send JSON content type with API key header', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"TransactionID":"abc","MessageID":"def"}', { status: 200 }));

      const sender = new ElasticEmailSender(createConfig({ apiKey: 'my-secret-key' }));
      await sender.send(createSendParams());

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-ElasticEmail-ApiKey']).toBe('my-secret-key');
    });

    it('should send correct JSON body with Recipients, Content, and Merge', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"TransactionID":"abc","MessageID":"def"}', { status: 200 }));

      const sender = new ElasticEmailSender(createConfig());
      const params = createSendParams({
        to: 'test@domain.com',
        templateId: 'my-template',
        mergeFields: { username: 'Carlos', verification_url: 'https://example.com/verify' },
        from: { email: 'sender@domain.com', name: 'Sender Name' },
      });
      await sender.send(params);

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.Recipients.To).toEqual(['test@domain.com']);
      expect(body.Content.TemplateName).toBe('my-template');
      expect(body.Content.From).toBe('Sender Name <sender@domain.com>');
      expect(body.Content.Merge.username).toBe('Carlos');
      expect(body.Content.Merge.verification_url).toBe('https://example.com/verify');
    });

    it('should include default subject when not provided', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"TransactionID":"abc","MessageID":"def"}', { status: 200 }));

      const sender = new ElasticEmailSender(createConfig());
      await sender.send(createSendParams());

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.Content.Subject).toBe('Verifica tu email - MultiBotAgents');
    });

    it('should use custom subject when provided', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"TransactionID":"abc","MessageID":"def"}', { status: 200 }));

      const sender = new ElasticEmailSender(createConfig());
      await sender.send(createSendParams({ subject: 'Custom Subject' }));

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.Content.Subject).toBe('Custom Subject');
    });

    it('should include AbortSignal for timeout', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"TransactionID":"abc","MessageID":"def"}', { status: 200 }));

      const sender = new ElasticEmailSender(createConfig());
      await sender.send(createSendParams());

      const [, options] = fetchMock.mock.calls[0];
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('send - validation', () => {
    it('should throw ElasticEmailHttpError when apiKey is empty', async () => {
      const sender = new ElasticEmailSender(createConfig({ apiKey: '' }));
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailHttpError);
    });

    it('should throw ElasticEmailHttpError when fromEmail is empty', async () => {
      const sender = new ElasticEmailSender(createConfig({ fromEmail: '' }));
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailHttpError);
    });
  });

  describe('send - HTTP errors', () => {
    it('should throw ElasticEmailHttpError on 400 response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"Error":"Bad request"}', { status: 400 }));

      const sender = new ElasticEmailSender(createConfig());
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailHttpError);
    });

    it('should throw ElasticEmailHttpError on 401 response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const sender = new ElasticEmailSender(createConfig());
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailHttpError);
    });

    it('should throw ElasticEmailHttpError on 500 response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

      const sender = new ElasticEmailSender(createConfig());
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailHttpError);
    });

    it('should include status code and body in ElasticEmailHttpError', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"Error":"Rate limit"}', { status: 429 }));

      const sender = new ElasticEmailSender(createConfig());

      try {
        await sender.send(createSendParams());
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ElasticEmailHttpError);
        expect((err as ElasticEmailHttpError).statusCode).toBe(429);
        expect((err as ElasticEmailHttpError).responseBody).toContain('Rate limit');
      }
    });
  });

  describe('send - network errors', () => {
    it('should throw ElasticEmailNetworkError on fetch rejection', async () => {
      fetchMock.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

      const sender = new ElasticEmailSender(createConfig());
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailNetworkError);
    });

    it('should throw ElasticEmailNetworkError on abort (timeout)', async () => {
      fetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      const sender = new ElasticEmailSender(createConfig());
      await expect(sender.send(createSendParams())).rejects.toThrow(ElasticEmailNetworkError);
    });

    it('should include original error message in ElasticEmailNetworkError', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      const sender = new ElasticEmailSender(createConfig());

      try {
        await sender.send(createSendParams());
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ElasticEmailNetworkError);
        expect((err as ElasticEmailNetworkError).message).toContain('Connection refused');
      }
    });
  });
});
