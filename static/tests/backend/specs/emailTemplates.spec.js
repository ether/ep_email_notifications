'use strict';

const assert = require('node:assert/strict');

const {
  getConfirmationEmail,
  getNotificationEmail,
  getUserLocale,
  normalizeLocale,
} = require('../../../../emailTemplates');

{
  const email = getConfirmationEmail({
    action: 'subscribe',
    locale: 'fr-CA',
    padId: 'test-pad',
    padUrl: 'https://example.test/p/test-pad',
    token: 'abc123',
  });

  assert.equal(email.subject, 'Confirmation d’inscription par e-mail pour le pad test-pad');
  assert.match(
      email.text,
      /Veuillez cliquer sur ce lien pour valider votre inscription au pad test-pad/,
  );
  assert.match(email.text, /https:\/\/example\.test\/p\/test-pad\/subscribe=abc123/);
}

{
  const email = getNotificationEmail({
    event: 'end',
    locale: 'pt-BR',
    padId: 'test-pad',
    padUrl: 'https://example.test/p/test-pad',
  });

  assert.equal(email.subject, 'Someone finished editing test-pad');
  assert.match(email.text, /This pad is done being edited:/);
  assert.match(email.text, /You can unsubscribe from these emails in the pad's Settings window\./);
}

{
  assert.equal(getUserLocale({language: 'de-DE'}), 'de');
  assert.equal(normalizeLocale('hu_HU'), 'hu');
  assert.equal(normalizeLocale(), 'en');
}
