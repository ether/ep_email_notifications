import {expect, test} from '@playwright/test';
import {goToNewPad} from 'ep_etherpad-lite/tests/frontend-new/helper/padHelper';

test.beforeEach(async ({page}) => {
  await goToNewPad(page);
});

test.describe('ep_email_notifications', () => {
  const malformedEmail = 'tutti@bad-email';
  const goodEmail = 'tutti@non-existing-domain.org';

  const openSettings = async (page: any) => {
    await page.locator('.buttonicon-settings').click();
    await expect(page.locator('.ep_email_settings')).toBeVisible();
  };

  test('subscribe with no notification options shows missing-options notice', async ({page}) => {
    await openSettings(page);
    await page.locator('#ep_email_form_mysettings [name=ep_email]').fill(goodEmail);
    await page.locator('#ep_email_form_mysettings [name=ep_email_onStart]').uncheck();
    await page.locator('#ep_email_form_mysettings [name=ep_email_onEnd]').uncheck();
    await page.locator('#ep_email_form_mysettings [name=ep_email_subscribe]').click();
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    await expect(page.locator('.emailNotificationsSubscrOptionsMissing')).toBeVisible();
  });

  test('subscribe with malformed email is rejected', async ({page}) => {
    await openSettings(page);
    await page.locator('#ep_email_form_mysettings [name=ep_email]').fill(malformedEmail);
    await page.locator('#ep_email_form_mysettings [name=ep_email_onStart]').check();
    await page.locator('#ep_email_form_mysettings [name=ep_email_subscribe]').click();
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
    await expect(page.locator('.emailNotificationsSubscrResponseBad')).toBeVisible();
  });

  test('unsubscribe with unregistered email is rejected', async ({page}) => {
    await openSettings(page);
    await page.locator('#ep_email_form_mysettings [name=ep_email]').fill(goodEmail);
    await page.locator('#ep_email_form_mysettings [name=ep_email_unsubscribe]').click();
    await expect(page.locator('.gritter-item').first()).toBeVisible({timeout: 30_000});
    const missing = await page.evaluate(
        () => (window as any).clientVars && (window as any).clientVars.ep_email_missing);
    if (missing) test.skip(true, 'email settings not configured');
    await expect(page.locator('.emailNotificationsUnsubscrResponseBad')).toBeVisible();
  });
});
