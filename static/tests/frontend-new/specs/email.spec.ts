import {expect, test} from '@playwright/test';
import {goToNewPad} from 'ep_etherpad-lite/tests/frontend-new/helper/padHelper';

test.beforeEach(async ({page}) => {
  await goToNewPad(page);
});

test.describe('ep_email_notifications', () => {
  const malformedEmail = 'tutti@bad-email';
  const goodEmail = 'tutti@non-existing-domain.org';

  // Settings popup opens but .ep_email_settings stays collapsed by default;
  // legacy spec used jQuery's .slideDown() and reached into hidden inputs
  // anyway. Drive the form via DOM so visibility doesn't gate anything.
  const submitForm = (
      page: any,
      {name, email, onStart, onEnd}: {
        name: string; email: string; onStart: boolean; onEnd: boolean;
      },
  ) => page.evaluate(
      ({name, email, onStart, onEnd}: any) => {
        const set = (selector: string, mutate: (el: HTMLInputElement) => void) => {
          const el = document.querySelector<HTMLInputElement>(selector);
          if (!el) throw new Error(`element ${selector} not found`);
          mutate(el);
        };
        set('#ep_email_form_mysettings [name=ep_email]', (el) => { el.value = email; });
        set('#ep_email_form_mysettings [name=ep_email_onStart]',
            (el) => { el.checked = onStart; });
        set('#ep_email_form_mysettings [name=ep_email_onEnd]',
            (el) => { el.checked = onEnd; });
        // Mirror the plugin's per-button option setter so the click handler's
        // ep_email_option check passes regardless of the order Playwright
        // fires the event.
        const optEl = document.querySelector<HTMLInputElement>(
            '#ep_email_form_mysettings [name=ep_email_option]')!;
        if (name === 'ep_email_subscribe') optEl.value = 'subscribe';
        else if (name === 'ep_email_unsubscribe') optEl.value = 'unsubscribe';
        // dispatchEvent fires synchronously, so the click handler (and
        // checkAndSend) runs to completion in this same task — no chance for
        // the popup's USERINFO_GET response handler to slip in.
        document.querySelector<HTMLElement>(
            `#ep_email_form_mysettings [name=${name}]`)!.dispatchEvent(
            new MouseEvent('click', {bubbles: true, cancelable: true}));
      }, {name, email, onStart, onEnd});
  const openSettings = (page: any) => page.evaluate(
      () => document.querySelector<HTMLElement>('.buttonicon-settings')!.click());

  // Wait for the plugin's postAceInit to run so the click handler on
  // [name=ep_email_subscribe] / [name=ep_email_unsubscribe] is bound.
  // postAceInit normalizes clientVars.panelDisplayLocation to an object
  // (the server ships the literal string 'undefined' when the plugin
  // isn't configured), so a typeof === 'object' check is a reliable proxy.
  const waitForPluginReady = (page: any) => page.waitForFunction(() => {
    const cv = (window as any).clientVars;
    return cv && typeof cv.panelDisplayLocation === 'object';
  }, undefined, {timeout: 30_000});

  test('subscribe with no notification options shows missing-options notice', async ({page}) => {
    await waitForPluginReady(page);
    await openSettings(page);
    await submitForm(page, {
      name: 'ep_email_subscribe', email: goodEmail, onStart: false, onEnd: false,
    });
    // checkAndSend short-circuits with no server round-trip when no options are
    // checked, so this assertion holds in CI even without ep_email_notifications
    // configured in settings.json.
    const gritter = page.locator('.emailNotificationsSubscrOptionsMissing');
    await expect(gritter).toHaveCount(1, {timeout: 30_000});
    // Assert the localized strings rendered, not just that the gritter exists.
    // window._ in core is an unbound reference to html10n.get, so naïvely
    // calling window._('key') returns undefined and the gritter would render
    // with title "× undefined" and missing text — which the count check
    // wouldn't catch. en.json values are reproduced verbatim here so a
    // localization regression breaks this test instead of the user.
    await expect(gritter).toContainText('Email subscription error');
    await expect(gritter).toContainText('You need to check at least one checkbox.');
  });

  // The mysettings menu label is rendered server-side and translated via html10n's
  // data-l10n-id pass; assert that ep_email_notifications.* keys actually resolve
  // on this page so a future locale-loading regression is loud.
  test('mysettings menu label is localized', async ({page}) => {
    await waitForPluginReady(page);
    await expect(page.locator('label[for="options-emailNotifications"]'))
        .toHaveText('Email Notifications', {timeout: 30_000});
  });

  test('subscribe with malformed email is rejected', async ({page}) => {
    await waitForPluginReady(page);
    await openSettings(page);
    await submitForm(page, {
      name: 'ep_email_subscribe', email: malformedEmail, onStart: true, onEnd: false,
    });
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
    await expect(page.locator('.emailNotificationsSubscrResponseBad')).toHaveCount(1);
  });

  test('unsubscribe with unregistered email is rejected', async ({page}) => {
    await waitForPluginReady(page);
    await openSettings(page);
    await submitForm(page, {
      name: 'ep_email_unsubscribe', email: goodEmail, onStart: false, onEnd: false,
    });
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
    await expect(page.locator('.emailNotificationsUnsubscrResponseBad')).toHaveCount(1);
  });
});
