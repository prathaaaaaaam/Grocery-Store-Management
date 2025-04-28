document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    console.log("Attempting login with:", { email, password });

    // Validate email format
    if (!validateEmail(email)) {
        showError("Please enter a valid email address.");
        return;
    }

    // Validate password (e.g., ensure it's not empty)
    if (!password) {
        showError("Please enter a password.");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log("Server response:", data);

        if (response.ok) {
            localStorage.setItem('access_token', data.token);
            showSuccess("Login successful! Redirecting...");
            setTimeout(() => {
                window.location.href = 'admin_dashboard.html';
            }, 2000);
        } else {
            showError(data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showError('Cannot connect to the server. Please ensure the server is running and try again.');
    }
});

// Email validation function
function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

// Helper functions for alerts
function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.innerHTML = `<strong>Error!</strong> ${message}`;
    errorAlert.classList.remove('d-none', 'alert-success');
    errorAlert.classList.add('alert-danger', 'show');
    setTimeout(() => errorAlert.classList.add('d-none'), 5000);
}

function showSuccess(message) {
    const successAlert = document.getElementById('successAlert');
    successAlert.innerHTML = `<strong>Success!</strong> ${message}`;
    successAlert.classList.remove('d-none', 'alert-danger');
    successAlert.classList.add('alert-success', 'show');
}