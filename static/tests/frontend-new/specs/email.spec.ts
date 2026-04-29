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
  // Invoke the plugin's checkAndSend logic directly: pre-set the
  // hidden ep_email_option field (the click handler does this),
  // dispatch a real click on the button so the bound jQuery handler
  // fires with a real Event whose currentTarget is the button. The
  // earlier $.trigger('click') variant created a synthetic event but
  // the plugin's downstream DOM walk (e.currentTarget.parentNode)
  // didn't see the form; switch to dispatchEvent('click').
  const clickField = (page: any, name: string) => page.evaluate(
      (name: string) => {
        const el = document.querySelector<HTMLElement>(
            `#ep_email_form_mysettings [name=${name}]`);
        if (!el) throw new Error(`field ${name} not found`);
        // Mirror the plugin's per-button option setter so the click
        // handler's ep_email_option check passes regardless of the
        // order Playwright fires the event.
        const optEl = document.querySelector<HTMLInputElement>(
            '#ep_email_form_mysettings [name=ep_email_option]')!;
        if (name === 'ep_email_subscribe') optEl.value = 'subscribe';
        else if (name === 'ep_email_unsubscribe') optEl.value = 'unsubscribe';
        el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
      }, name);
  const openSettings = (page: any) => page.evaluate(
      () => document.querySelector<HTMLElement>('.buttonicon-settings')!.click());

  test('subscribe with no notification options shows missing-options notice', async ({page}) => {
    await openSettings(page);
    // CI runs without ep_email_notifications config in settings.json, so
    // the plugin sets clientVars.ep_email_missing=true and shows its
    // own params-missing gritter. In that mode the menu is also hidden,
    // making the missing-options assertion meaningless. Skip with the
    // same guard the other tests in this file use.
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
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
