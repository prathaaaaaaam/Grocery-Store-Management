function logout() {
    fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => console.log(data.message))
    .catch(error => console.error('Logout error:', error))
    .finally(() => {
        localStorage.removeItem('access_token');
        window.location.href = `login.html?logout=${Date.now()}`;
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}

window.logout = logout;