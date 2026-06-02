const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: { send: mockSend }
  }))
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

const emailService = require('../../src/utils/emailService');

describe('emailService account deletion confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    mockSend.mockResolvedValue({ data: { id: 'deletion-email' } });
  });

  test('sends a branded account deletion confirmation with safe user content', async () => {
    await emailService.sendAccountDeletionEmail({
      to: 'deleted@example.com',
      username: 'Lucia <collector>'
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'deleted@example.com',
      subject: 'Your NumisRoma account has been deleted',
      html: expect.stringContaining('Your account has been deleted'),
      text: expect.stringContaining('Your NumisRoma account has been permanently deleted')
    }));

    const [{ html }] = mockSend.mock.calls[0];
    expect(html).toContain('Lucia &lt;collector&gt;');
    expect(html).toContain('NumisRoma');
    expect(html).not.toContain('Lucia <collector>');
  });
});

describe('emailService login security alert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    mockSend.mockResolvedValue({ data: { id: 'security-email' } });
  });

  test('sends approximate-location and risk information without unsafe markup', async () => {
    await emailService.sendSecurityAlertEmail({
      to: 'collector@example.com',
      username: 'Lucia',
      device: 'macOS - Chrome',
      location: 'Rome <script>',
      riskFlags: ['new_device', 'new_country']
    });
    const [{ html, text }] = mockSend.mock.calls[0];
    expect(html).toContain('New sign-in noticed');
    expect(html).toContain('Rome &lt;script&gt;');
    expect(text).toContain('new device, new country');
  });
});

describe('emailService data export ready email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    mockSend.mockResolvedValue({ data: { id: 'data-export-email' } });
  });

  test('sends a signed download link without unsafe username markup', async () => {
    await emailService.sendDataExportReadyEmail({
      to: 'collector@example.com',
      username: 'Lucia <collector>',
      downloadUrl: 'https://api.numisroma.com/api/users/me/data-export/request-1/download?token=secret-token',
      expiresAt: new Date('2026-06-04T12:00:00.000Z'),
      fileSize: 2048
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'collector@example.com',
      subject: 'Your NumisRoma data download is ready',
      html: expect.stringContaining('Your data download is ready'),
      text: expect.stringContaining('Download link:')
    }));

    const [{ html, text }] = mockSend.mock.calls[0];
    expect(html).toContain('Lucia &lt;collector&gt;');
    expect(html).not.toContain('Lucia <collector>');
    expect(text).toContain('secret-token');
  });
});
