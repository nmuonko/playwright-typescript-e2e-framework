import { test, expect } from '@faithfulness/fixtures';
import { createAssessmentRequest, createCareerApplication, createReferral } from '@faithfulness/data/forms';
import { mockFormSubmit, submittedPayload } from '@faithfulness/mocks/forms.mock';

test.describe('Assessment request (two-step form)', { tag: '@regression' }, () => {
  const stepTwo = {
    schedule: '4 to 8 hours per day',
    start: 'Within a week',
    contactMethod: 'Phone call',
    payment: 'Yes',
  } as const;

  test('validates each step before moving on', async ({
    requestAssessmentPage: assessment,
    networkGuard,
  }) => {
    await assessment.goto();
    await assessment.continueButton.click();
    for (const message of [
      'Please enter a name',
      'Please enter a phone number',
      'Enter a valid ZIP code',
      'Please choose who needs care',
      'Please choose at least one type of care',
    ]) {
      await expect(assessment.error(message)).toBeVisible();
    }
    await expect(assessment.submitButton).toBeHidden();

    await assessment.fillStepOne(createAssessmentRequest());
    await assessment.continueToStepTwo();
    await assessment.submitButton.click();
    for (const message of [
      'Please choose a schedule',
      'Please choose when care is needed',
      'Please choose the best way to reach you',
      'Please choose a payment option',
    ]) {
      await expect(assessment.error(message)).toBeVisible();
    }
    expect(networkGuard.writeAttempts).toEqual([]);
  });

  test('Back returns to step one with the entered values intact', async ({
    requestAssessmentPage: assessment,
  }) => {
    const request = createAssessmentRequest();
    await assessment.goto();
    await assessment.fillStepOne(request);
    await assessment.continueToStepTwo();
    await assessment.backButton.click();
    await expect(assessment.name).toHaveValue(request.person.fullName);
    await expect(assessment.zip).toHaveValue(request.zip);
    await expect(assessment.relationship).toHaveValue(request.relationship);
  });

  test(
    'submits both steps as one request (mocked)',
    { tag: ['@smoke', '@mocked'] },
    async ({ requestAssessmentPage: assessment, networkGuard }) => {
      const request = createAssessmentRequest();
      const submit = mockFormSubmit(networkGuard, 'assessment', { kind: 'success' });

      await assessment.goto();
      await assessment.fillStepOne(request);
      await assessment.continueToStepTwo();
      await assessment.fillStepTwo(stepTwo, request.notes);
      await assessment.submitButton.click();

      const payload = await submittedPayload(submit);
      expect(payload).toMatchObject({
        full_name: request.person.fullName,
        email: request.person.email,
        phone: request.person.phone,
        zip: request.zip,
        relationship: request.relationship,
        weekly_hours: stepTwo.schedule,
        start_timeframe: stepTwo.start,
        preferred_contact: stepTwo.contactMethod,
        payment_method: stepTwo.payment,
        message: request.notes,
      });
      await expect(
        assessment.page.getByRole('heading', { name: 'Your assessment request is in.' }),
      ).toBeVisible();
    },
  );
});

test.describe('Professional referral', { tag: '@regression' }, () => {
  test('requires the referrer and client details', async ({ referPage, networkGuard }) => {
    await referPage.goto();
    await referPage.submitButton.click();
    await expect(referPage.error('Tell us where you are referring from')).toBeVisible();
    await expect(referPage.organisation).toHaveAttribute('aria-invalid', 'true');
    await expect(referPage.clientName).toHaveAttribute('aria-invalid', 'true');
    expect(networkGuard.writeAttempts).toEqual([]);
  });

  test(
    'sends the referral with consent recorded (mocked)',
    { tag: '@mocked' },
    async ({ referPage, networkGuard }) => {
      const referral = createReferral();
      const submit = mockFormSubmit(networkGuard, 'referral', { kind: 'success' });

      await referPage.goto();
      await referPage.fill(referral);
      await referPage.submitButton.click();

      const payload = await submittedPayload(submit);
      expect(payload).toMatchObject({
        referrer_name: referral.referrer.fullName,
        referrer_org: referral.organisation,
        referrer_phone: referral.referrer.phone,
        referrer_email: referral.referrer.email,
        full_name: referral.client.fullName,
        phone: referral.client.phone,
        town: referral.town,
        zip: referral.zip,
        urgency: 'Within 48 hours',
        referral_authorized: true,
        relationship: 'Professional Referral',
        source: 'professional_referral',
      });
      await expect(referPage.successHeading).toBeVisible();
    },
  );
});

test.describe('Caregiver application', { tag: '@regression' }, () => {
  test('requires name, phone and a valid email', async ({ careersPage, networkGuard }) => {
    await careersPage.goto();
    await careersPage.submitButton.click();
    await expect(careersPage.error('Please enter your name')).toBeVisible();
    await expect(careersPage.error('Please enter a phone number')).toBeVisible();
    await expect(careersPage.error('Enter a valid email')).toBeVisible();
    expect(networkGuard.writeAttempts).toEqual([]);
  });

  const rejectedFiles = [
    {
      label: 'an executable',
      file: { name: 'resume.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') },
      message: 'Please upload a PDF, Word document, text file or photo.',
    },
    {
      label: 'a file over 5MB',
      file: { name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
      message: 'Please upload a file of 5MB or less.',
    },
  ];

  for (const { label, file, message } of rejectedFiles) {
    test(`rejects ${label} as a resume`, async ({ careersPage }) => {
      await careersPage.goto();
      await careersPage.resumeInput.setInputFiles(file);
      await expect(careersPage.error(message)).toBeVisible();
    });
  }

  test(
    'submits the application with an attached resume (mocked)',
    { tag: '@mocked' },
    async ({ careersPage, networkGuard }) => {
      const application = createCareerApplication();
      const resume = Buffer.from('%PDF-1.4\n% automated test resume\n');
      const submit = mockFormSubmit(networkGuard, 'application', { kind: 'success' });

      await careersPage.goto();
      await careersPage.fill(application);
      await careersPage.resumeInput.setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: resume,
      });
      await careersPage.submitButton.click();

      const payload = await submittedPayload(submit);
      expect(payload).toMatchObject({
        full_name: application.person.fullName,
        email: application.person.email,
        phone: application.person.phone,
        position: application.position,
        availability: application.availability,
        experience: application.experience,
        resume: {
          name: 'resume.pdf',
          type: 'application/pdf',
          size: resume.length,
          data: resume.toString('base64'),
        },
      });
      await expect(careersPage.successHeading).toBeVisible();
    },
  );
});

test.describe('Client portal sign-in', { tag: '@regression' }, () => {
  test('blocks an empty sign-in in the browser without contacting the auth service', async ({
    authPage,
    networkGuard,
  }) => {
    await authPage.goto();
    await authPage.signInButton.click();
    await expect(authPage.email).toBeFocused();
    expect(await authPage.email.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(
      true,
    );
    expect(networkGuard.writeAttempts).toEqual([]);
  });
});
