const request = require('supertest');
const express = require('express');

jest.mock('../../src/utils/emailService', () => ({
  sendContactNotificationEmail: jest.fn()
}));

const Contact = require('../../src/models/Contact');
const { sendContactNotificationEmail } = require('../../src/utils/emailService');
const contactRoutes = require('../../src/routes/contact');

describe('contact routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    sendContactNotificationEmail.mockResolvedValue({ data: { id: 'email-1' } });

    app = express();
    app.use(express.json());
    app.use('/api/contact', contactRoutes);
  });

  test('saves a contact message and sends it to support', async () => {
    const payload = {
      name: 'Marcus',
      email: 'marcus@example.com',
      subject: 'Catalog correction',
      message: 'I found a catalog entry that may need a small correction.'
    };

    const res = await request(app)
      .post('/api/contact')
      .send(payload)
      .expect(201);

    expect(res.body.message).toBe('Message sent successfully');

    const contact = await Contact.findOne({ email: payload.email });
    expect(contact.subject).toBe(payload.subject);
    expect(sendContactNotificationEmail).toHaveBeenCalledWith({
      ...payload,
      contactId: contact._id
    });
  });

  test('returns validation errors for invalid payloads', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        name: 'M',
        email: 'not-an-email',
        subject: 'Hi',
        message: 'Too short'
      })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(sendContactNotificationEmail).not.toHaveBeenCalled();
  });
});
