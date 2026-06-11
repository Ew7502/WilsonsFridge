// --- 1. SETUP SUPABASE ---
// IMPORTANT: Replace these with your actual keys from Supabase!
const supabaseUrl = 'https://nedhlhgmuvssjmoivduz.supabase.co';
const supabaseKey = 'sb_publishable_gV2ohpJdj-qyQKtrvXv_dg_gm0WkbIR';

// CHANGE: We renamed this to 'supabaseClient' so it doesn't clash!
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Global state
let currentItems = [];

// --- 2. AUTHENTICATION ---
async function login() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('login-error');

    // CHANGE: We use 'supabaseClient' here now
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorMsg.textContent = "Incorrect password. Try again!";
    } else {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        showPage('home');
        fetchItems();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('password-input').value = '';
}

// --- 3. DATABASE OPERATIONS ---
async function fetchItems() {
    const { data, error } = await supabaseClient.from('fridge_items').select('*');
    if (!error) {
        currentItems = data;
        checkExpiredItems(); // Alert Mum if needed!
    }
}

async function addItem(event) {
    event.preventDefault();
    const name = document.getElementById('item-name').value;
    const date = document.getElementById('item-date').value || null;
    const category = document.getElementById('item-category').value;
    const qty = document.getElementById('item-qty').value;

    const { error } = await supabaseClient.from('fridge_items').insert([
        { name: name, use_by_date: date, category: category, quantity: qty }
    ]);

    if (!error) {
        alert("Added to fridge!");
        fetchItems(); // Refresh data
        showPage('stock'); // Go to stock page to see it
    }
}

async function deleteItem(id) {
    await supabaseClient.from('fridge_items').delete().eq('id', id);
    await fetchItems(); // Refresh data
    showPage(document.getElementById('content-area').dataset.currentPage); // Refresh current view
}

// --- 4. PAGE RENDERING (The Magic Sidebar) ---
function showPage(page) {
    const content = document.getElementById('content-area');
    content.dataset.currentPage = page; // Remember where we are for refreshing
    content.innerHTML = ''; // Clear current content

    if (page === 'home') {
        content.innerHTML = `
            <h1>Welcome to the Wilson Fridge! 🧊</h1>
            <p>Use the sidebar to check what snacks Dad can eat, alert Mum about use-by dates, and see what's in stock.</p>
        `;
    } 
    else if (page === 'snacks') {
        content.innerHTML = `
            <h2>Snack Time</h2>
            <div style="margin-bottom: 20px;">
                <button onclick="renderList('Savoury')">Savoury</button>
                <button onclick="renderList('Sweet')">Sweet</button>
                <button onclick="renderList('All Snacks')">All Snacks</button>
            </div>
            <div id="sub-list-area">Click an option above to see snacks!</div>
        `;
    }
    else if (page === 'dates') {
        const today = new Date().toISOString().split('T')[0];
        content.innerHTML = `
            <h2>Use By Dates</h2>
            <div class="grid-3-col">
                <div class="col" id="col-today"><h3>Today/Overdue</h3></div>
                <div class="col" id="col-tomorrow"><h3>Tomorrow</h3></div>
                <div class="col" id="col-week"><h3>This Week</h3></div>
            </div>
        `;
        // Put items in columns
        currentItems.forEach(item => {
            if(!item.use_by_date || item.category === 'Reserved') return;
            const html = createItemHTML(item);
            
            // Basic date logic for display
            if(item.use_by_date <= today) document.getElementById('col-today').innerHTML += html;
            else document.getElementById('col-week').innerHTML += html; 
        });
    }
    else if (page === 'donoteat') {
        content.innerHTML = `<h2>🚫 DO NOT EAT (Reserved)</h2>`;
        const reserved = currentItems.filter(i => i.category === 'Reserved');
        reserved.forEach(item => content.innerHTML += createItemHTML(item));
    }
    else if (page === 'stock') {
        content.innerHTML = `<h2>All Fridge Stock</h2>`;
        currentItems.forEach(item => content.innerHTML += createItemHTML(item));
    }
    else if (page === 'additem') {
        content.innerHTML = `
            <h2>Add New Item</h2>
            <form onsubmit="addItem(event)" style="max-width: 400px; background: white; padding: 20px; border-radius: 8px;">
                <div class="form-group">
                    <label>Item Name *</label>
                    <input type="text" id="item-name" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="item-category">
                        <option value="Savoury">Savoury Snack</option>
                        <option value="Sweet">Sweet Snack</option>
                        <option value="General">General Food</option>
                        <option value="Reserved">DO NOT EAT (Reserved)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Use By Date (Optional)</label>
                    <input type="date" id="item-date">
                </div>
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" id="item-qty" value="1" min="1">
                </div>
                <button type="submit">Add to Fridge</button>
            </form>
        `;
    }
}

// Helper to generate the HTML for a single item with a delete button
function createItemHTML(item) {
    const dateText = item.use_by_date ? `<br><small>Use by: ${item.use_by_date}</small>` : '';
    return `
        <div class="item-card">
            <div>
                <strong>${item.name}</strong> (Qty: ${item.quantity})
                ${dateText}
            </div>
            <button class="delete-btn" onclick="deleteItem(${item.id})">Remove</button>
        </div>
    `;
}

// Helper for the Snacks sub-menu
window.renderList = function(type) {
    const area = document.getElementById('sub-list-area');
    area.innerHTML = `<h3>${type}</h3>`;
    let filtered = currentItems.filter(i => i.category !== 'Reserved');
    
    if (type !== 'All Snacks') {
        filtered = filtered.filter(i => i.category === type);
    }
    
    if(filtered.length === 0) area.innerHTML += "<p>Nothing here right now!</p>";
    filtered.forEach(item => area.innerHTML += createItemHTML(item));
}

// Check for expired items to alert Mum
function checkExpiredItems() {
    const today = new Date().toISOString().split('T')[0];
    const expired = currentItems.filter(i => i.use_by_date && i.use_by_date <= today && i.category !== 'Reserved');
    
    const alertBox = document.getElementById('alerts-container');
    if (expired.length > 0) {
        alertBox.innerHTML = `<div class="alert-banner">⚠️ Mum! You have ${expired.length} item(s) expiring today or already overdue! Check the Dates tab.</div>`;
    } else {
        alertBox.innerHTML = '';
    }
}
