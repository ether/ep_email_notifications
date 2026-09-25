'use strict';

const fs = require('fs');
const path = require('path');

const defaultLocale = 'en';
const localeDir = path.join(__dirname, 'locales');
const availableLocales = new Set(
    fs.readdirSync(localeDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => path.basename(name, '.json')),
);
const translations = new Map();

const normalizeLocale = (locale) => {
  if (typeof locale !== 'string' || locale === '') return defaultLocale;
  const normalized = locale.toLowerCase().replace(/_/g, '-');
  for (const candidate of [normalized, normalized.split('-')[0]]) {
    if (availableLocales.has(candidate)) return candidate;
  }
  return defaultLocale;
};

const getTranslations = (locale) => {
  const resolvedLocale = normalizeLocale(locale);
  if (!translations.has(resolvedLocale)) {
    translations.set(resolvedLocale, JSON.parse(
        fs.readFileSync(path.join(localeDir, `${resolvedLocale}.json`), 'utf8')));
  }
  return translations.get(resolvedLocale);
};

const translate = (locale, key, replacements = {}) => {
  const template = getTranslations(locale)[key] ?? getTranslations(defaultLocale)[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, name)) return match;
    return `${replacements[name]}`;
  });
};

const getUserLocale = (userInfo) => normalizeLocale(userInfo && userInfo.language);

const getConfirmationEmail = ({action, locale, padId, padUrl, token}) => {
  const actionUrl = `${padUrl}/${action}=${token}`;
  const subjectKey = action === 'unsubscribe'
    ? 'ep_email_notifications.emailUnsubscriptionConfirmationSubject'
    : 'ep_email_notifications.emailSubscriptionConfirmationSubject';
  const bodyKey = action === 'unsubscribe'
    ? 'ep_email_notifications.emailUnsubscriptionConfirmationBody'
    : 'ep_email_notifications.emailSubscriptionConfirmationBody';
  return {
    subject: translate(locale, subjectKey, {padId}),
    text: translate(locale, bodyKey, {actionUrl, padId}),
  };
};

const getNotificationEmail = ({event, locale, padId, padUrl}) => {
  const footer = translate(locale, 'ep_email_notifications.emailFooter');
  const subjectKey = event === 'end'
    ? 'ep_email_notifications.emailNotificationEndSubject'
    : 'ep_email_notifications.emailNotificationStartSubject';
  const bodyKey = event === 'end'
    ? 'ep_email_notifications.emailNotificationEndBody'
    : 'ep_email_notifications.emailNotificationStartBody';
  return {
    subject: translate(locale, subjectKey, {padId}),
    text: translate(locale, bodyKey, {footer, padUrl}),
  };
};

module.exports = {
  defaultLocale,
  getConfirmationEmail,
  getNotificationEmail,
  getUserLocale,
  normalizeLocale,
  translate,
};
