let salesChart = null;
document.addEventListener('DOMContentLoaded', initializeAuth);

// Global navigate function for HTML onclick
window.navigate = function (page) {
    const pageMap = {
        'dashboard': 'admin_dashboard.html',
        'inventory': 'inventory.html',
        'orders': 'orders.html',
        'reports': 'reports.html',
        'suppliers': 'suppliers.html',
        'logout': 'login.html'
    };
    const mappedPage = pageMap[page] || page;
    handleNavigation(mappedPage);
    updateActiveNav(page);
};

// CORE AUTHENTICATION FLOW
async function initializeAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || localStorage.getItem('access_token');
    const isProtectedPage = !window.location.pathname.includes('login.html') &&
        !window.location.pathname.includes('signup.html');

    if (!token && isProtectedPage) {
        redirectToLogin();
        return;
    }

    try {
        const isValid = await verifyToken(token);
        if (!isValid) {
            redirectToLogin();
            return;
        }

        if (urlParams.has('token')) {
            localStorage.setItem('access_token', token);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (isProtectedPage) {
            setupEventListeners();
            loadPageContent();
            populateCalendar();
            setInitialActiveNav();
            if (window.location.pathname.includes('inventory.html')) {
                fetchSuppliersForForm();
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        redirectToLogin();
    }
}

// Populate Suppliers for Product Form
async function fetchSuppliersForForm() {
    try {
        const response = await fetch('http://localhost:5000/api/suppliers', {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        const suppliers = await response.json();
        const supplierSelect = document.querySelector('#productForm select[name="supplier_id"]');
        if (supplierSelect) {
            supplierSelect.innerHTML = suppliers.map(supplier => `
                <option value="${supplier.Supplier_ID}">${supplier.Name}</option>
            `).join('');
        }
    } catch (error) {
        console.error('Error fetching suppliers for form:', error);
    }
}

// Populate Calendar with current month
function populateCalendar() {
    const calendarDays = document.getElementById('calendar-days');
    if (!calendarDays) return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.querySelector('.calendar h3').textContent = `${monthNames[currentMonth]} ${currentYear}`;

    let daysHTML = '';
    for (let i = 0; i < firstDay; i++) {
        daysHTML += '<span class="inactive"></span>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        daysHTML += `<span class="${isToday ? 'today' : ''}">${day}</span>`;
    }
    calendarDays.innerHTML = daysHTML;
}

// CORE FUNCTIONS
async function verifyToken(token) {
    if (!token) return false;
    try {
        const response = await fetch('http://localhost:5000/api/check-auth', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok;
    } catch (error) {
        console.error('Token verification failed:', error);
        return false;
    }
}

function setupEventListeners() {
    document.addEventListener('click', e => {
        const navButton = e.target.closest('.nav-link');
        if (navButton) handleNavigation(navButton.dataset.page);
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function loadPageContent() {
    const path = window.location.pathname;

    if (path.includes('suppliers.html')) fetchSuppliers();
    if (path.includes('inventory.html')) fetchInventory();
    if (path.includes('orders.html')) fetchOrders();
    if (path.includes('reports.html')) fetchReports();
    if (path.includes('admin_dashboard.html')) fetchDashboardData();
}

// NAVIGATION & AUTH
function handleNavigation(page) {
    const token = localStorage.getItem('access_token');
    if (!token && !page.includes('login.html') && !page.includes('signup.html')) {
        redirectToLogin();
        return;
    }

    window.location.href = page;
}

function redirectToLogin() {
    localStorage.removeItem('access_token');
    window.location.href = 'login.html';
}

window.getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

function logout() {
    localStorage.removeItem('access_token');
    window.location.replace('login.html');
}

function setInitialActiveNav() {
    const path = window.location.pathname;
    const navButtons = document.querySelectorAll('.navbar button');
    navButtons.forEach(button => {
        const page = button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (page) {
            button.classList.remove('active');
            if (path.includes(pageMap[page] || page)) {
                button.classList.add('active');
            }
        }
    });
}

function updateActiveNav(page) {
    const navButtons = document.querySelectorAll('.navbar button');
    navButtons.forEach(button => {
        button.classList.remove('active');
        const buttonPage = button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (buttonPage === page) {
            button.classList.add('active');
        }
    });
}

const pageMap = {
    'dashboard': 'admin_dashboard.html',
    'inventory': 'inventory.html',
    'orders': 'orders.html',
    'reports': 'reports.html',
    'suppliers': 'suppliers.html',
    'logout': 'login.html'
};

// Modal Handling
function showModal(modalId, title) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    document.getElementById(`${modalId === 'productModal' ? 'modalTitle' : modalId === 'orderModal' ? 'orderModalTitle' : 'supplierModalTitle'}`).textContent = title;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    const form = document.getElementById(`${modalId === 'productModal' ? 'productForm' : modalId === 'orderModal' ? 'orderForm' : 'supplierForm'}`);
    if (form) form.reset();
}

// Product Form Handling
function showAddProductForm() {
    showModal('productModal', 'Add Product');
    document.getElementById('productForm').onsubmit = addProduct;
}

async function addProduct(e) {
    e.preventDefault();
    const form = e.target;
    const selectedStatus = form.status.value;
    const quantity = form.quantity.value !== ""
        ? parseInt(form.quantity.value)
        : (selectedStatus === 'In Stock' ? 10 : selectedStatus === 'Low Stock' ? 5 : 0);
    const data = {
        name: form.name.value,
        category: form.category.value,
        quantity: quantity,
        price: parseFloat(form.price.value),
        restock_threshold: 10,
        supplier_id: parseInt(form.supplier_id.value)
    };

    showLoading();
    try {
        const response = await fetch('http://localhost:5000/api/inventory/add', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to add product');
        }
        closeModal('productModal');
        fetchInventory();
    } catch (error) {
        handleDataError('product addition', error);
    } finally {
        hideLoading();
    }
}

async function editProduct(productId) {
    showModal('productModal', 'Edit Product');
    const form = document.getElementById('productForm');
    form.onsubmit = (e) => updateProduct(e, productId);

    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/inventory/${productId}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch product data');
        const product = await response.json();

        form.name.value = product.Name || '';
        form.category.value = product.Category || '';
        form.quantity.value = product.Stock_Level || 0;
        form.price.value = product.Price || 0;
        form.status.value = product.Stock_Level >= 10 ? 'In Stock' :
            product.Stock_Level > 0 ? 'Low Stock' : 'Out of Stock';
        form.supplier_id.value = product.Supplier_ID || '';
        form.product_id.value = product.Product_ID || productId;
    } catch (error) {
        handleDataError('product fetch', error);
    } finally {
        hideLoading();
    }
}

async function updateProduct(e, productId) {
    e.preventDefault();
    const form = e.target;
    const selectedStatus = form.status.value;
    const quantity = form.quantity.value !== ""
        ? parseInt(form.quantity.value)
        : (selectedStatus === 'In Stock' ? 10 : selectedStatus === 'Low Stock' ? 5 : 0);
    const data = {
        name: form.name.value,
        category: form.category.value,
        quantity: quantity,
        price: parseFloat(form.price.value),
        restock_threshold: 10,
        supplier_id: parseInt(form.supplier_id.value)
    };

    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/inventory/${productId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update product');
        }
        closeModal('productModal');
        fetchInventory();
    } catch (error) {
        handleDataError('product update', error);
    } finally {
        hideLoading();
    }
}

async function deleteProduct(productId) {
    if (productId === null || productId === undefined) {
        showErrorAlert('Cannot delete: Product ID is missing');
        return;
    }
    if (!confirm('Are you sure you want to delete this product?')) return;
    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/inventory/${productId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete product');
        }
        fetchInventory();
    } catch (error) {
        handleDataError('product deletion', error);
    } finally {
        hideLoading();
    }
}

// Supplier Form Handling
function showAddSupplierForm() {
    showModal('supplierModal', 'Add Supplier');
    document.getElementById('supplierForm').onsubmit = addSupplier;
}

async function addSupplier(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        contact_number: form.contact_number.value,
        address: form.address.value
    };

    showLoading();
    try {
        const response = await fetch('http://localhost:5000/api/suppliers/add', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to add supplier');
        }
        closeModal('supplierModal');
        fetchSuppliers();
    } catch (error) {
        handleDataError('supplier addition', error);
    } finally {
        hideLoading();
    }
}

async function editSupplier(supplierId) {
    showModal('supplierModal', 'Edit Supplier');
    const form = document.getElementById('supplierForm');
    form.onsubmit = (e) => updateSupplier(e, supplierId);

    try {
        const response = await fetch(`http://localhost:5000/api/suppliers/${supplierId}`, {
            headers: getAuthHeaders()
        });
        const supplier = await response.json();
        form.name.value = supplier.Name;
        form.contact_number.value = supplier.Contact_Number;
        form.address.value = supplier.Address;
        form.supplier_id.value = supplierId;
    } catch (error) {
        handleDataError('supplier fetch', error);
    }
}

async function updateSupplier(e, supplierId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        contact_number: form.contact_number.value,
        address: form.address.value
    };

    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update supplier');
        }
        closeModal('supplierModal');
        fetchSuppliers();
    } catch (error) {
        handleDataError('supplier update', error);
    } finally {
        hideLoading();
    }
}

async function deleteSupplier(supplierId) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/suppliers/${supplierId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete supplier');
        }
        fetchSuppliers();
    } catch (error) {
        handleDataError('supplier deletion', error);
    } finally {
        hideLoading();
    }
}

// Order Form Handling
async function showEditOrderForm(orderId) {
    console.log(`Fetching order with ID: ${orderId}`);
    showModal('orderModal', 'Edit Order');
    const form = document.getElementById('orderForm');
    form.onsubmit = (e) => updateOrder(e, orderId);

    showLoading();
    try {
        const response = await fetch('http://localhost:5000/api/orders', {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch orders: ${errorText}`);
        }
        const orders = await response.json();
        console.log('Orders fetched:', orders);
        const order = orders.find(o => o.Order_ID === orderId);
        if (!order) throw new Error(`Order with ID ${orderId} not found`);

        console.log('Selected order:', order);
        form.customer_name.value = order.Customer_Name || 'Guest';
        form.order_date.value = order.Order_Date; // Should be in YYYY-MM-DD format
        form.total_amount.value = parseFloat(order.Total_Amount).toFixed(2);
        form.status.value = order.Status || 'Completed';
    } catch (error) {
        console.error('Error in showEditOrderForm:', error);
        handleDataError('order fetch', error);
    } finally {
        hideLoading();
    }
}

async function updateOrder(e, orderId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        status: form.status.value
    };
    console.log(`Updating order ${orderId} with data:`, data);

    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log('Update response:', result);
        if (!response.ok) {
            throw new Error(result.error || `Failed to update order: ${response.statusText}`);
        }
        closeModal('orderModal');
        fetchOrders();
    } catch (error) {
        console.error('Error in updateOrder:', error);
        handleDataError('order update', error);
    } finally {
        hideLoading();
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    console.log(`Deleting order ${orderId}`);
    showLoading();
    try {
        const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        console.log('Delete response:', result);
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete order');
        }
        fetchOrders();
    } catch (error) {
        console.error('Error in deleteOrder:', error);
        handleDataError('order deletion', error);
    } finally {
        hideLoading();
    }
}

// DATA FETCHING
async function fetchInventory() {
    showLoading();
    try {
        const response = await fetch('http://localhost:5000/api/inventory', {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch inventory');
        const data = await response.json();
        populateInventory(data);
    } catch (error) {
        handleDataError('inventory', error);
    } finally {
        hideLoading();
    }
}

async function fetchSuppliers() {
    showLoading();
    try {
        const response = await fetch('http://localhost:5000/api/suppliers', {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        const data = await response.json();
        populateSuppliers(data);
    } catch (error) {
        handleDataError('suppliers', error);
    } finally {
        hideLoading();
    }
}

async function fetchOrders() {
    showLoading();
    try {
        const response = await fetch('http://localhost:5000/api/orders', {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch orders: ${errorText}`);
        }
        const data = await response.json();
        console.log('Orders fetched for table:', data);
        populateOrders(data);
    } catch (error) {
        console.error('Error in fetchOrders:', error);
        handleDataError('orders', error);
    } finally {
        hideLoading();
    }
}

async function fetchReports() {
    showLoading();
    const period = document.getElementById('report-period').value || '30';
    try {
        const response = await fetch(`http://localhost:5000/api/sales-report?period=${period}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        const data = result.data || [];
        if (data.length === 0) {
            showErrorAlert('No sales data available for the selected period');
        }
        populateReports(data);
    } catch (error) {
        console.error('Fetch reports error:', error);
        handleDataError('reports', error);
    } finally {
        hideLoading();
    }
}

async function fetchDashboardData() {
    showLoading();
    try {
        const userResponse = await fetch('http://localhost:5000/api/user', {
            headers: getAuthHeaders()
        });
        if (!userResponse.ok) throw new Error('Failed to fetch user data');
        const userData = await userResponse.json();
        const adminNameElement = document.getElementById('admin-name');
        if (adminNameElement) {
            adminNameElement.textContent = `${userData.fname} ${userData.lname}`;
        }

        const response = await fetch('http://localhost:5000/api/metrics', {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Metrics fetch failed');
        const data = await response.json();

        const dailySales = data.daily_sales || 0;
        const salesTarget = 50000;
        const salesPercentage = Math.min((dailySales / salesTarget) * 100, 100);
        document.getElementById('daily-sales').textContent =
            `${dailySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const salesRing = document.getElementById('daily-sales-ring');
        const circumference = 2 * Math.PI * 50;
        salesRing.style.strokeDasharray = `${(salesPercentage / 100) * circumference} ${circumference}`;

        const totalProducts = data.total_products || 0;
        document.getElementById('total-products').textContent = totalProducts;
        const totalProductsRing = document.getElementById('total-products-ring');
        const totalProductsPercentage = Math.min((totalProducts / 1000) * 100, 100);
        totalProductsRing.style.strokeDasharray = `${(totalProductsPercentage / 100) * circumference} ${circumference}`;

        const lowStock = data.low_stock_count || 0;
        document.getElementById('low-stock').textContent = lowStock;
        const lowStockRing = document.getElementById('low-stock-ring');
        const lowStockPercentage = Math.min((lowStock / totalProducts) * 100, 100) || 0;
        lowStockRing.style.strokeDasharray = `${(lowStockPercentage / 100) * circumference} ${circumference}`;

        const pendingOrdersResponse = await fetch('http://localhost:5000/api/orders/count', {
            headers: getAuthHeaders()
        });
        const pendingOrdersData = await pendingOrdersResponse.json();
        const pendingOrders = pendingOrdersData.count || 0;
        document.getElementById('pending-orders').textContent = pendingOrders;
        const pendingOrdersRing = document.getElementById('pending-orders-ring');
        const pendingOrdersPercentage = Math.min((pendingOrders / 50) * 100, 100);
        pendingOrdersRing.style.strokeDasharray = `${(pendingOrdersPercentage / 100) * circumference} ${circumference}`;

        const ordersResponse = await fetch('http://localhost:5000/api/orders', {
            headers: getAuthHeaders()
        });
        const ordersData = await ordersResponse.json();
        const ordersTbody = document.querySelector('#recentOrders tbody');
        if (ordersTbody) {
            ordersTbody.innerHTML = ordersData.map(order => `
                <tr>
                    <td>#ORD-${order.Order_ID}</td>
                    <td>${order.Customer_Name || 'Guest'}</td>
                    <td>${new Date(order.Order_Date).toLocaleDateString()}</td>
                    <td>${Number(order.Total_Amount).toFixed(2)}</td>
                    <td><span class="status-indicator status-ok">${order.Status || 'Completed'}</span></td>
                </tr>
            `).join('');
        }

        const inventoryResponse = await fetch('http://localhost:5000/api/inventory', {
            headers: getAuthHeaders()
        });
        const inventoryData = await inventoryResponse.json();
        const totalItems = inventoryData.length;
        const inStock = inventoryData.filter(item => item.Stock_Level >= item.Restock_Threshold).length;
        const lowStockCount = inventoryData.filter(item => item.Stock_Level < item.Restock_Threshold && item.Stock_Level > 0).length;
        const outOfStock = inventoryData.filter(item => item.Stock_Level === 0).length;

        document.getElementById('in-stock-bar').style.width = `${(inStock / totalItems) * 100}%`;
        document.getElementById('in-stock-count').textContent = `${inStock}/${totalItems}`;
        document.getElementById('low-stock-bar').style.width = `${(lowStockCount / totalItems) * 100}%`;
        document.getElementById('low-stock-bar-count').textContent = `${lowStockCount}/${totalItems}`;
        document.getElementById('out-of-stock-bar').style.width = `${(outOfStock / totalItems) * 100}%`;
        document.getElementById('out-of-stock-count').textContent = `${outOfStock}/${totalItems}`;
    } catch (error) {
        handleDataError('dashboard metrics', error);
    } finally {
        hideLoading();
    }
}

// UI UPDATES
function populateSuppliers(data) {
    const tbody = document.querySelector('#suppliers-table tbody');
    if (!tbody) return;

    tbody.innerHTML = data.map(supplier => `
        <tr>
            <td>${supplier.Supplier_ID}</td>
            <td>${supplier.Name}</td>
            <td>${supplier.Contact_Number}</td>
            <td>${supplier.Address}</td>
            <td>
                <button class="btn-action edit" onclick="editSupplier(${supplier.Supplier_ID})">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-action delete" onclick="deleteSupplier(${supplier.Supplier_ID})">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function populateInventory(data) {
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;

    tbody.innerHTML = data.map(item => {
        const statusText = item.Stock_Level === 0 ? 'Out of Stock' :
            item.Stock_Level < item.Restock_Threshold ? 'Low Stock' : 'In Stock';
        const statusClass = item.Stock_Level === 0 ? 'status-critical' :
            item.Stock_Level < item.Restock_Threshold ? 'status-low' : 'status-ok';
        return `
        <tr>
            <td>${item.Name}</td>
            <td>${item.Category}</td>
            <td>${item.Stock_Level}</td>
            <td>${Number(item.Price).toFixed(2)}</td>
            <td>
                <span class="status-indicator ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <button class="btn-action edit" onclick="editProduct(${item.Product_ID || 'null'})">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-action delete" onclick="deleteProduct(${item.Product_ID ?? null})">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </td>
        </tr>
    `}).join('');
}

function populateOrders(data) {
    const tbody = document.querySelector('#orders-table tbody');
    if (!tbody) return;

    tbody.innerHTML = data.map(order => `
        <tr>
            <td>#ORD-${order.Order_ID}</td>
            <td>${order.Customer_Name || 'Guest'}</td>
            <td>${new Date(order.Order_Date).toLocaleDateString()}</td>
            <td>${Number(order.Total_Amount).toFixed(2)}</td>
            <td><span class="status-indicator ${order.Status === 'Completed' ? 'status-ok' : order.Status === 'Pending' ? 'status-low' : 'status-critical'}">${order.Status || 'Completed'}</span></td>
            <td>
                <button class="btn-action edit" onclick="showEditOrderForm(${order.Order_ID})">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-action delete" onclick="deleteOrder(${order.Order_ID})">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function populateReports(data) {
    const ctx = document.getElementById('sales-chart')?.getContext('2d');
    if (!ctx) {
        console.error('Sales chart canvas not found');
        showErrorAlert('Chart initialization failed. Please refresh the page.');
        return;
    }

    if (salesChart) {
        salesChart.destroy(); // Destroy previous instance
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.period_label),
            datasets: [{
                label: 'Sales',
                data: data.map(item => Number(item.total_sales)),
                borderColor: '#00C4B4',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#FFFFFF' }
                }
            }
        }
    });
}

// ERROR HANDLING
function handleDataError(context, error) {
    console.error(`Error in ${context}:`, error);
    alert(`Error in ${context}: ${error.message}`);
}

function showErrorAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.textContent = message;
    document.body.prepend(alert);
    setTimeout(() => alert.remove(), 5000);
}