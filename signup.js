document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("signup-form").addEventListener("submit", async function (event) {
        event.preventDefault();

        const fname = document.getElementById("fname").value.trim();
        const lname = document.getElementById("lname").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("confirm-password")?.value.trim();

        if (!fname || !lname) {
            showAlert("errorAlert", "First Name and Last Name are required.");
            return;
        }
        if (!validateEmail(email)) {
            showAlert("errorAlert", "Enter a valid email address.");
            return;
        }
        if (!validatePhone(phone)) {
            showAlert("errorAlert", "Enter a valid 10-digit phone number.");
            return;
        }
        if (!validatePassword(password)) {
            showAlert("errorAlert", "Password must be 8+ chars with uppercase, number, and symbol.");
            return;
        }
        if (password !== confirmPassword) {
            showAlert("errorAlert", "Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fname, lname, email, phone, password }),
                credentials: "include"
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || "Signup failed.");
            }

            showAlert("successAlert", "Signup successful! Redirecting...");
            setTimeout(() => window.location.href = "./login.html", 2000);
        } catch (error) {
            console.error("Signup error:", error);
            showAlert("errorAlert", error.message || "Network error! Please check your connection.");
        }
    });
});

function validateEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validatePhone(phone) {
    return /^[0-9]{10}$/.test(phone);
}

function validatePassword(password) {
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

function showAlert(alertId, message) {
    const alert = document.getElementById(alertId);
    if (!alert) return;

    alert.innerHTML = `<strong>${alertId === "successAlert" ? "Success!" : "Error!"}</strong> ${message}`;
    alert.classList.remove("d-none", "alert-success", "alert-danger");
    alert.classList.add(alertId === "successAlert" ? "alert-success" : "alert-danger", "show");
    setTimeout(() => alert.classList.add("d-none"), 10000); // Increased to 10s
}