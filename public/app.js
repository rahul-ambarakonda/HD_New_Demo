const waitlistForm = document.querySelector('.waitlist__form');
const emailInput = document.getElementById('email-input');
const submitButton = document.querySelector('.waitlist__submit-btn');
const waitlistStatus = document.getElementById('waitlist-status');

const emailRegex = /^[^\s@]+@[^\s@]+\\.[^\\s@]{2,}$/;

if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Clear previous status and styling
        waitlistStatus.textContent = '';
        waitlistStatus.className = '';
        emailInput.removeAttribute('aria-invalid');
        emailInput.style.borderColor = '';

        const email = emailInput.value.trim();

        // Client-side validation
        if (!email || !emailRegex.test(email)) {
            waitlistStatus.textContent = 'That does not look like an email address.';
            waitlistStatus.classList.add('text-negative'); // Using a class for color based on design tokens
            emailInput.setAttribute('aria-invalid', 'true');
            emailInput.style.borderColor = 'var(--color-negative)';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Joining…';
        submitButton.classList.add('btn--block'); // Add block class for mobile responsive behavior

        try {
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                if (response.status === 201) {
                    waitlistStatus.textContent = 'You are on the list. We will email you once.';
                    waitlistStatus.classList.add('text-positive');
                    emailInput.value = ''; // Clear input on success
                    waitlistStatus.focus(); // Move focus to status message
                } else if (response.status === 409) {
                    waitlistStatus.textContent = 'You are already on the list.';
                    waitlistStatus.classList.add('text-positive');
                }
            } else {
                // Handle API error responses
                let errorMessage = 'Something went wrong. Try again shortly.';
                switch (response.status) {
                    case 400: // INVALID_EMAIL (should be caught by client-side, but good fallback)
                        errorMessage = data.error?.message || 'That does not look like an email address.';
                        emailInput.setAttribute('aria-invalid', 'true');
                        emailInput.style.borderColor = 'var(--color-negative)';
                        break;
                    case 409: // ALREADY_JOINED (server-side duplicate check)
                        errorMessage = 'You are already on the list.';
                        break;
                    case 429:
                        errorMessage = 'Too many attempts. Try again in a minute.';
                        break;
                    case 500: // STORE_UNAVAILABLE or other server errors
                    default:
                        errorMessage = data.error?.message || 'Something went wrong. Try again shortly.';
                }
                waitlistStatus.textContent = errorMessage;
                waitlistStatus.classList.add('text-negative');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            waitlistStatus.textContent = 'Something went wrong. Try again shortly.';
            waitlistStatus.classList.add('text-negative');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Join the waitlist';
            submitButton.classList.remove('btn--block'); // Remove block class
        }
    });
}
