const page = document.body.dataset;
const requestForm = document.querySelector('[data-request-form]');
const unlockForm = document.querySelector('[data-unlock-form]');
const gate = document.querySelector('[data-gate]');
const checkEmailStep = document.querySelector('[data-check-email]');
const content = document.querySelector('[data-content]');
const requestStatus = document.querySelector('[data-request-status]');
const unlockStatus = document.querySelector('[data-unlock-status]');
const requestButton = document.querySelector('[data-request-button]');
const unlockButton = document.querySelector('[data-unlock-button]');
const pendingEmailLine = document.querySelector('[data-pending-email]');
const readerLine = document.querySelector('[data-reader-line]');
const changeEmailButtons = document.querySelectorAll('[data-change-email]');
let trackedThisLoad = false;

const setStatus = (element, message, isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-visible', Boolean(message));
  element.classList.toggle('is-error', isError);
};

const setStep = (step) => {
  gate.hidden = step !== 'request';
  checkEmailStep.hidden = step !== 'password';
  content.hidden = step !== 'content';
};

const getPending = () => {
  try {
    return JSON.parse(localStorage.getItem(`${page.storageKey}:pending`) || 'null');
  } catch (error) {
    localStorage.removeItem(`${page.storageKey}:pending`);
    return null;
  }
};

const setPending = (person) => {
  localStorage.setItem(`${page.storageKey}:pending`, JSON.stringify(person));
  if (pendingEmailLine) {
    pendingEmailLine.textContent = person.alreadyRequested
      ? 'That email is already on the list. Use the password from your inbox to open it here.'
      : page.pendingMessage
      ? page.pendingMessage.replace('{email}', person.email)
      : `We sent the password to ${person.email}.`;
  }
  if (unlockForm) {
    unlockForm.elements.email.value = person.email;
  }
};

const revealResource = (person = {}) => {
  setStep('content');
  if (person.name && readerLine) {
    readerLine.textContent = `${person.name}, the playbook is ready below.`;
  } else if (readerLine) {
    readerLine.textContent = 'The playbook is ready below.';
  }
  trackResourceOpen(person);
  content.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const trackResourceOpen = async (person = {}) => {
  const email = String(person.email || '').trim().toLowerCase();
  if (trackedThisLoad || !email || !email.includes('@')) return;
  trackedThisLoad = true;

  try {
    await fetch('/.netlify/functions/track-resource-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: person.name || '',
        email,
        product: page.productName,
        notes: page.openTrackingNotes || `Opened ${page.productName}`,
      }),
    });
  } catch (error) {
    console.error('Resource open tracking failed', error);
  }
};

try {
  const saved = JSON.parse(localStorage.getItem(page.storageKey) || 'null');
  if (saved && saved.email) {
    revealResource(saved);
  } else {
    const pending = getPending();
    if (pending && pending.email) {
      setPending(pending);
      setStep('password');
    }
  }
} catch (error) {
  localStorage.removeItem(page.storageKey);
  setStep('request');
}

changeEmailButtons.forEach((button) => {
  button.addEventListener('click', () => {
    localStorage.removeItem(`${page.storageKey}:pending`);
    setStatus(unlockStatus, '');
    setStep('request');
    requestForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

requestForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(requestStatus, '');

  const formData = new FormData(requestForm);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    setStatus(requestStatus, 'Please enter a valid email so the password can be sent to you.', true);
    return;
  }

  requestButton.disabled = true;
  requestButton.textContent = 'Sending...';

  try {
    const response = await fetch('/.netlify/functions/product-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        product: page.productName,
        notes: page.trackingNotes,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.message || 'Something did not send.');
    }
    const pending = {
      name: data.name || name,
      email,
      requestedAt: new Date().toISOString(),
      alreadyRequested: Boolean(data.alreadyRequested),
    };
    setPending(pending);
    setStep('password');
    checkEmailStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setStatus(requestStatus, 'Something did not send. Please try again or email admin@theconfidentclinician.me.', true);
  } finally {
    requestButton.disabled = false;
    requestButton.textContent = page.requestButtonText || 'Send Me The Password';
  }
});

unlockForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(unlockStatus, '');

  const pending = getPending() || {};
  const formData = new FormData(unlockForm);
  const email = String(formData.get('email') || pending.email || '').trim().toLowerCase();
  const password = String(formData.get('password') || '').trim();

  if (!email || !email.includes('@') || !password) {
    setStatus(unlockStatus, 'Enter the email you used and the password from your email.', true);
    return;
  }

  unlockButton.disabled = true;
  unlockButton.textContent = 'Checking...';

  try {
    const response = await fetch('/.netlify/functions/verify-resource-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        product: page.productName,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.message || 'That email and password did not match.');
    }
    const access = {
      name: data.name || pending.name || '',
      email,
      openedAt: new Date().toISOString(),
    };
    localStorage.setItem(page.storageKey, JSON.stringify(access));
    revealResource(access);
  } catch (error) {
    setStatus(unlockStatus, error.message || 'That email and password did not match. Check your email and try again, or use a different email.', true);
  } finally {
    unlockButton.disabled = false;
    unlockButton.textContent = page.readyButtonText || 'Open Playbook';
  }
});
