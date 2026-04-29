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
  const fillField = (page: any, name: string, value: string) => page.evaluate(
      ({name, value}: {name: string; value: string}) => {
        const el = document.querySelector<HTMLInputElement>(
            `#ep_email_form_mysettings [name=${name}]`);
        if (!el) throw new Error(`field ${name} not found`);
        el.value = value;
      }, {name, value});
  const setCheck = (page: any, name: string, checked: boolean) => page.evaluate(
      ({name, checked}: {name: string; checked: boolean}) => {
        const el = document.querySelector<HTMLInputElement>(
            `#ep_email_form_mysettings [name=${name}]`);
        if (!el) throw new Error(`field ${name} not found`);
        el.checked = checked;
      }, {name, checked});
  // Trigger the click through jQuery so the plugin's $().on('click', …)
  // handlers fire reliably regardless of whether the form is hidden.
  // A native el.click() also works for jQuery handlers, but the plugin's
  // checkAndSend reads e.currentTarget.parentNode and does jQuery DOM
  // walks afterwards that depend on jQuery's event normalization.
  const clickField = (page: any, name: string) => page.evaluate(
      (name: string) => {
        const w = window as any;
        if (!w.$) throw new Error('jQuery not on window');
        const $el = w.$(`#ep_email_form_mysettings [name=${name}]`);
        if (!$el.length) throw new Error(`field ${name} not found`);
        $el.trigger('click');
      }, name);
  const openSettings = (page: any) => page.evaluate(
      () => document.querySelector<HTMLElement>('.buttonicon-settings')!.click());

  test('subscribe with no notification options shows missing-options notice', async ({page}) => {
    await openSettings(page);
    await fillField(page, 'ep_email', goodEmail);
    await setCheck(page, 'ep_email_onStart', false);
    await setCheck(page, 'ep_email_onEnd', false);
    await clickField(page, 'ep_email_subscribe');
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    // emailNotificationsSubscrOptionsMissing element may itself be hidden
    // until the gritter shows it; assert presence instead of visibility.
    await expect(page.locator('.emailNotificationsSubscrOptionsMissing')).toHaveCount(1);
  });

  test('subscribe with malformed email is rejected', async ({page}) => {
    await openSettings(page);
    await fillField(page, 'ep_email', malformedEmail);
    await setCheck(page, 'ep_email_onStart', true);
    await clickField(page, 'ep_email_subscribe');
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
    await expect(page.locator('.emailNotificationsSubscrResponseBad')).toHaveCount(1);
  });

  test('unsubscribe with unregistered email is rejected', async ({page}) => {
    await openSettings(page);
    await fillField(page, 'ep_email', goodEmail);
    await clickField(page, 'ep_email_unsubscribe');
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
    await expect(page.locator('.emailNotificationsUnsubscrResponseBad')).toHaveCount(1);
  });
});
