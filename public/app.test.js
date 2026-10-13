// A simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

/**
 * Unit tests for public/app.js
 *
 * This script heavily interacts with the DOM and the global `fetch` API.
 * To perform unit tests under the constraint of "plain assertions with no framework"
 * and to achieve isolation, extensive manual mocking of the DOM (document.querySelector,
 * document.getElementById, element properties, event listeners) and the global `fetch`
 * function is necessary. This allows testing the script's logic in a controlled, in-memory environment.
 */

// --- Manual DOM Mocks ---
const mockForm = {
  addEventListener: (event, handler) => {
    mockForm._eventListeners = mockForm._eventListeners || {};
    mockForm._eventListeners[event] = handler;
  },
  _eventListeners: {},
  // Helper to simulate a form submission event
  _dispatchEvent: async (event, data) => {
    if (mockForm._eventListeners[event]) {
      // Execute the handler, assuming it might be async
      await mockForm._eventListeners[event](data);
    }
  }
};

const mockEmailInput = {
  value: '',
  setAttribute: (attr, val) => mockEmailInput[attr] = val,
  removeAttribute: (attr) => delete mockEmailInput[attr],
  style: {},
  _focused: false,
  focus: () => { mockEmailInput._focused = true; }
};

const mockSubmitButton = {
  disabled: false,
  textContent: '',
  classList: {
    _classes: new Set(), // Using a Set to mock classList behavior
    add: (cls) => mockSubmitButton.classList._classes.add(cls),
    remove: (cls) => mockSubmitButton.classList._classes.delete(cls),
    contains: (cls) => mockSubmitButton.classList._classes.has(cls)
  }
};

const mockWaitlistStatus = {
  textContent: '',
  className: '',
  style: {},
  _focused: false,
  focus: () => { mockWaitlistStatus._focused = true; }
};

// Store original DOM functions to restore them after tests
const originalQuerySelector = document.querySelector;
const originalGetElementById = document.getElementById;

// Override DOM functions with mocks
document.querySelector = (selector) => {
  if (selector === '.waitlist__form') return mockForm;
  if (selector === '.waitlist__submit-btn') return mockSubmitButton;
  // The `app.js` code uses `.waitlist__form` to select the form,
  // but then targets children like `email-input` and `waitlist-status` by ID.
  // It also uses `.waitlist__submit-btn` for the submit button.
  // For `app.js`'s current content, `querySelecctor` is only used for `waitlistForm` and `submitButton`
  return null; // Return null if not one of our mocked elements
};

document.getElementById = (id) => {
  if (id === 'email-input') return mockEmailInput;
  if (id === 'waitlist-status') return mockWaitlistStatus;
  return null; // Return null if not one of our mocked elements
};

// --- Manual Fetch Mock ---
let mockFetchResponse = {};
let fetchCalledWith = null; // To record arguments of fetch call

const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  fetchCalledWith = { url, options };
  // Return a promise that resolves with our mock response
  return Promise.resolve({
    ok: mockFetchResponse.ok,
    status: mockFetchResponse.status,
    json: async () => mockFetchResponse.jsonResult // Return the result from json() method
  });
};

// Function to reset mocks for each test run
function resetMocks() {
  mockEmailInput.value = '';
  mockEmailInput.removeAttribute('aria-invalid');
  mockEmailInput.style = {}; // Reset style object
  mockEmailInput._focused = false;

  mockSubmitButton.disabled = false;
  mockSubmitButton.textContent = '';
  mockSubmitButton.classList._classes.clear();

  mockWaitlistStatus.textContent = '';
  mockWaitlistStatus.className = ''; // Reset className
  mockWaitlistStatus.style = {}; // Reset style object
  mockWaitlistStatus._focused = false;

  mockForm._eventListeners = {}; // Clear event listeners

  mockFetchResponse = { // Default mock response for success
    ok: true,
    status: 201,
    jsonResult: { status: 'joined' }
  };
  fetchCalledWith = null;

  // Re-import the script to re-attach event listeners on fresh mocks
  // This is crucial because app.js attaches event listeners on load
  // The import should happen within each test if truly isolated, but for plain assertions, we run it once and reset mocks.
  // This approach means app.js must be designed to be re-runnable or its init logic idempotent.
  // For this exercise, we will assume event listener re-attachment on mockForm._dispatchEvent will be the test trigger
}

// Immediately invoked async function to use await for imports and to wrap tests
(async () => {
  try {
    // Dynamically import app.js after mocks are in place
    // This ensures app.js queries the mocked DOM elements when it initializes
    await import('../app.js'); 

    console.log('--- Testing public/app.js ---');

    // Test Case 1: Client-side validation - Empty email
    resetMocks();
    mockEmailInput.value = '';
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockWaitlistStatus.textContent === 'That does not look like an email address.', 'Empty email: status message');
    assert(mockWaitlistStatus.style.color === 'var(--color-negative)', 'Empty email: status color');
    assert(mockEmailInput['aria-invalid'] === 'true', 'Empty email: aria-invalid');
    assert(mockEmailInput.style.borderColor === 'var(--color-negative)', 'Empty email: border color');
    assert(fetchCalledWith === null, 'Empty email: fetch should not be called');
    console.log('Test Case 1 Passed: Client-side validation - Empty email.');

    // Test Case 2: Client-side validation - Invalid email format
    resetMocks();
    mockEmailInput.value = 'invalid-email';
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockWaitlistStatus.textContent === 'That does not look like an email address.', 'Invalid email: status message');
    assert(mockEmailInput['aria-invalid'] === 'true', 'Invalid email: aria-invalid');
    assert(fetchCalledWith === null, 'Invalid email: fetch should not be called');
    console.log('Test Case 2 Passed: Client-side validation - Invalid email format.');

    // Test Case 3: Successful submission (201 Created)
    resetMocks();
    mockEmailInput.value = 'valid@example.com';
    mockFetchResponse = {
      ok: true,
      status: 201,
      jsonResult: { status: 'joined' }
    };
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockSubmitButton.disabled === false, '201 Created: button re-enabled');
    assert(mockSubmitButton.textContent === 'Join the waitlist', '201 Created: button text reverted');
    assert(!mockSubmitButton.classList.contains('btn--block'), '201 Created: button block class removed');
    assert(fetchCalledWith !== null, '201 Created: fetch should be called');
    assert(fetchCalledWith.options.method === 'POST', '201 Created: fetch method');
    assert(fetchCalledWith.options.headers['Content-Type'] === 'application/json', '201 Created: fetch Content-Type');
    assert(fetchCalledWith.options.body === JSON.stringify({ email: 'valid@example.com' }), '201 Created: fetch body');
    assert(mockWaitlistStatus.textContent === 'You are on the list. We will email you once.', '201 Created: status message');
    assert(mockWaitlistStatus.style.color === 'var(--color-positive)', '201 Created: status color');
    assert(mockEmailInput.value === '', '201 Created: email input cleared');
    assert(mockWaitlistStatus._focused === true, '201 Created: waitlist status focused');
    console.log('Test Case 3 Passed: Successful submission (201 Created).');

    // Test Case 4: Already on the list (409 Conflict from server, but still 'ok' for positive status message)
    resetMocks();
    mockEmailInput.value = 'existing@example.com';
    mockFetchResponse = {
      ok: true, 
      status: 409,
      jsonResult: { error: { code: 'ALREADY_JOINED', message: 'You are already on the list.' } }
    };
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockSubmitButton.disabled === false, '409 Conflict: button re-enabled');
    assert(mockWaitlistStatus.textContent === 'You are already on the list.', '409 Conflict: status message');
    assert(mockWaitlistStatus.style.color === 'var(--color-positive)', '409 Conflict: status color');
    console.log('Test Case 4 Passed: Already on the list (409 Conflict from server).');

    // Test Case 5: Too many requests (429)
    resetMocks();
    mockEmailInput.value = 'test@example.com';
    mockFetchResponse = {
      ok: false,
      status: 429,
      jsonResult: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a minute.' } }
    };
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockWaitlistStatus.textContent === 'Too many attempts. Try again in a minute.', '429: status message');
    assert(mockWaitlistStatus.style.color === 'var(--color-negative)', '429: status color');
    console.log('Test Case 5 Passed: Too many requests (429).');

    // Test Case 6: Server error (500) - with specific message
    resetMocks();
    mockEmailInput.value = 'test@example.com';
    mockFetchResponse = {
      ok: false,
      status: 500,
      jsonResult: { error: { code: 'SERVER_ERROR', message: 'Internal server error.' } }
    };
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockWaitlistStatus.textContent === 'Internal server error.', '500 (specific): status message from server');
    assert(mockWaitlistStatus.style.color === 'var(--color-negative)', '500 (specific): status color');

    // Test Case 6.1: Server error (500) - with generic message
    resetMocks();
    mockEmailInput.value = 'test@example.com';
    mockFetchResponse = {
      ok: false,
      status: 500,
      jsonResult: { error: { message: 'Some generic error.' } } // No explicit code
    };
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });
    assert(mockWaitlistStatus.textContent === 'Some generic error.', '500 (generic): generic status message');

    // Test Case 6.2: Server error (500) - empty error object
    resetMocks();
    mockEmailInput.value = 'test@example.com';
    mockFetchResponse = {
      ok: false,
      status: 500,
      jsonResult: {} // Empty error object
    };
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });
    assert(mockWaitlistStatus.textContent === 'Something went wrong. Try again shortly.', '500 (empty): fallback status message');
    console.log('Test Case 6 Passed: Server error (500).');

    // Test Case 7: Network error (fetch throws)
    resetMocks();
    mockEmailInput.value = 'test@example.com';
    // Temporarily replace global.fetch to simulate a network error
    global.fetch = async () => { throw new Error('Network down!'); }; 
    await mockForm._dispatchEvent('submit', { preventDefault: () => {} });

    assert(mockWaitlistStatus.textContent === 'Something went wrong. Try again shortly.', 'Network error: status message');
    assert(mockWaitlistStatus.style.color === 'var(--color-negative)', 'Network error: status color');
    assert(mockSubmitButton.disabled === false, 'Network error: button re-enabled');
    console.log('Test Case 7 Passed: Network error (fetch throws).');

  } catch (error) {
    console.error('public/app.js tests FAILED:', error.message);
  } finally {
    // Restore original globals to avoid polluting subsequent tests
    document.querySelector = originalQuerySelector;
    document.getElementById = originalGetElementById;
    global.fetch = originalFetch;
    console.log('public/app.js tests completed.');
  }
})();
