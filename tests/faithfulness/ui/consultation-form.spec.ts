import { test, expect } from '@faithfulness/fixtures';
import { consultationRequiredErrors, createConsultationRequest } from '@faithfulness/data/forms';
import { inAreaZips } from '@faithfulness/data/site';
import { mockFormSubmit, submittedPayload } from '@faithfulness/mocks/forms.mock';

test.describe('Free care consultation form', { tag: '@regression' }, () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  test(
    'empty submit flags every required field and sends nothing',
    { tag: '@smoke' },
    async ({ contactPage, networkGuard }) => {
      const { form } = contactPage;
      await form.submit();

      for (const message of consultationRequiredErrors) {
        await expect(form.error(message)).toBeVisible();
      }
      for (const field of [
        form.zip,
        form.relationship,
        form.urgency,
        form.schedule,
        form.payment,
        form.fullName,
        form.phone,
      ]) {
        await expect(field).toHaveAttribute('aria-invalid', 'true');
      }
      expect(networkGuard.writeAttempts).toEqual([]);
    },
  );

  const invalidInputs = [
    { field: 'zip', value: '12', message: 'Enter a valid ZIP code' },
    { field: 'email', value: 'not-an-email', message: 'Enter a valid email' },
  ] as const;

  for (const { field, value, message } of invalidInputs) {
    test(`rejects invalid ${field} "${value}"`, async ({ contactPage, networkGuard }) => {
      const { form } = contactPage;
      await form.fill(createConsultationRequest());
      await form[field].fill(value);
      await form.submit();

      await expect(form.error(message)).toBeVisible();
      await expect(form[field]).toHaveAttribute('aria-invalid', 'true');
      expect(networkGuard.writeAttempts).toEqual([]);
    });
  }

  test('email becomes required when email is the preferred contact method', async ({ contactPage }) => {
    const { form } = contactPage;
    await form.fill(createConsultationRequest({ preferredContact: 'Email' }));
    await form.email.clear();
    await form.submit();
    await expect(form.error('Please enter an email address so we can reach you by email')).toBeVisible();
  });

  for (const { zip, town } of inAreaZips) {
    test(`confirms coverage inline for ZIP ${zip}`, async ({ contactPage }) => {
      await contactPage.form.zip.fill(zip);
      await expect(contactPage.form.root.getByText(`Good news, we serve ${town}.`)).toBeVisible();
    });
  }

  test.describe('submission (backend mocked)', { tag: '@mocked' }, () => {
    test(
      'sends the entered lead details and shows the confirmation',
      { tag: '@smoke' },
      async ({ contactPage, networkGuard }) => {
        const lead = createConsultationRequest();
        const submit = mockFormSubmit(networkGuard, 'consultation', { kind: 'success' });

        await contactPage.form.fill(lead);
        await contactPage.form.submit();

        const payload = await submittedPayload(submit);
        expect(payload).toMatchObject({
          full_name: lead.person.fullName,
          phone: lead.person.phone,
          email: lead.person.email,
          zip: lead.zip,
          relationship: lead.relationship,
          urgency: lead.urgency,
          weekly_hours: lead.schedule,
          payment_method: lead.payment,
          preferred_contact: lead.preferredContact,
          message: lead.message,
          source: 'contact_page',
          hp_field: '',
        });
        // The form serialises care types in on-page order, not click order.
        expect([...(payload.service_interests as string[])].sort()).toEqual([...lead.careTypes].sort());
        await contactPage.form.expectSuccess();
        expect(submit.calls).toHaveLength(1);
      },
    );

    test('shows the server’s rejection message and keeps the entered data', async ({
      contactPage,
      networkGuard,
    }) => {
      const lead = createConsultationRequest();
      mockFormSubmit(networkGuard, 'consultation', {
        kind: 'rejected',
        error: 'We could not verify this request.',
      });

      await contactPage.form.fill(lead);
      await contactPage.form.submit();

      await expect(contactPage.form.alert).toHaveText('We could not verify this request.');
      await expect(contactPage.form.fullName).toHaveValue(lead.person.fullName);
      await expect(contactPage.form.successHeading).toBeHidden();
    });

    test('falls back to a call-us message when the server errors', async ({ contactPage, networkGuard }) => {
      mockFormSubmit(networkGuard, 'consultation', { kind: 'server-error' });
      await contactPage.form.fill(createConsultationRequest());
      await contactPage.form.submit();
      await expect(contactPage.form.alert).toHaveText(
        'Something went wrong. Please try again or give us a call.',
      );
    });
  });

  test('spam honeypot is invisible to people, keyboards and assistive technology', async ({
    contactPage,
  }) => {
    const honeypot = contactPage.form.root.locator('input[name="hp_field"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toBeHidden();
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('autocomplete', 'off');
    // Not in the accessibility tree, so screen-reader users are never asked to fill it.
    await expect(contactPage.form.root.getByRole('textbox', { name: 'Do not fill this in' })).toHaveCount(0);
  });
});
