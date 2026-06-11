// --- 1. SETUP SUPABASE ---
const supabaseUrl = 'https://nedhlhgmuvssjmoivduz.supabase.co';
const supabaseKey = 'sb_publishable_gV2ohpJdj-qyQKtrvXv_dg_gm0WkbIR';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Global state
let currentItems = [];

// --- 2. AUTHENTICATION ---
async function login() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('login-error');

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
        checkExpiredItems(); 
    }
}

async function addItem(event) {
    event.preventDefault();
    const name = document.getElementById('item-name').value;
    const date = document.getElementById('item-date').value || null;
    const qty = document.getElementById('item-qty').value;

    // CHANGE: Gather all checked boxes and join them into a list (e.g., "Sweet, Reserved")
    const checkboxes = document.querySelectorAll('input[name="category"]:checked');
    const categories = Array.from(checkboxes).map(cb => cb.value).join(', ');

    if (!categories) {
        alert("Please select at least one category!");
        return;
    }

    const { error } = await supabaseClient.from('fridge_items').insert([
        { name: name, use_by_date: date, category: categories, quantity: qty }
    ]);

    if (!error) {
        alert("Added to fridge!");
        fetchItems(); 
        showPage('stock'); 
    }
}

async function deleteItem(id) {
    await supabaseClient.from('fridge_items').delete().eq('id', id);
    await fetchItems(); 
    showPage(document.getElementById('content-area').dataset.currentPage); 
}

// --- 4. PAGE RENDERING ---
function showPage(page) {
    const content = document.getElementById('content-area');
    content.dataset.currentPage = page; 
    content.innerHTML = ''; 

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
        currentItems.forEach(item => {
            // CHANGE: Now we use .includes() to check if Reserved is anywhere in the tags
            if(!item.use_by_date || item.category.includes('Reserved')) return;
            const html = createItemHTML(item);
            
            if(item.use_by_date <= today) document.getElementById('col-today').innerHTML += html;
            else document.getElementById('col-week').innerHTML += html; 
        });
    }
    else if (page === 'donoteat') {
        content.innerHTML = `<h2>🚫 DO NOT EAT (Reserved)</h2>`;
        // CHANGE: Filter uses .includes()
        const reserved = currentItems.filter(i => i.category.includes('Reserved'));
        reserved.forEach(item => content.innerHTML += createItemHTML(item));
    }
    else if (page === 'stock') {
        content.innerHTML = `<h2>All Fridge Stock</h2>`;
        currentItems.forEach(item => content.innerHTML += createItemHTML(item));
    }
    else if (page === 'additem') {
        // CHANGE: Replaced the dropdown with checkboxes
        content.innerHTML = `
            <h2>Add New Item</h2>
            <form onsubmit="addItem(event)" style="max-width: 400px; background: white; padding: 20px; border-radius: 8px;">
                <div class="form-group">
                    <label>Item Name *</label>
                    <input type="text" id="item-name" required>
                </div>
                <div class="form-group">
                    <label>Categories (Select all that apply)</label>
                    <div style="margin-top: 10px;">
                        <label style="font-weight: normal;"><input type="checkbox" name="category" value="Savoury"> Savoury Snack</label><br>
                        <label style="font-weight: normal;"><input type="checkbox" name="category" value="Sweet"> Sweet Snack</label><br>
                        <label style="font-weight: normal;"><input type="checkbox" name="category" value="General"> General Food</label><br>
                        <label style="font-weight: normal;"><input type="checkbox" name="category" value="Reserved"> 🚫 DO NOT EAT (Reserved)</label>
                    </div>
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

// Helper to generate the HTML
function createItemHTML(item) {
    const dateText = item.use_by_date ? `<br><small>Use by: ${item.use_by_date}</small>` : '';
    return `
        <div class="item-card">
            <div>
                <strong>${item.name}</strong> (Qty: ${item.quantity})
                <br><small><i>Tags: ${item.category}</i></small>
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
    
    // CHANGE: Filter uses .includes() to handle multiple categories
    let filtered = currentItems.filter(i => !i.category.includes('Reserved'));
    
    if (type !== 'All Snacks') {
        filtered = filtered.filter(i => i.category.includes(type));
    } else {
        // If "All Snacks", only show items that are Savoury or Sweet
        filtered = filtered.filter(i => i.category.includes('Savoury') || i.category.includes('Sweet'));
    }
    
    if(filtered.length === 0) area.innerHTML += "<p>Nothing here right now!</p>";
    filtered.forEach(item => area.innerHTML += createItemHTML(item));
}

function checkExpiredItems() {
    const today = new Date().toISOString().split('T')[0];
    // CHANGE: Filter uses .includes()
    const expired = currentItems.filter(i => i.use_by_date && i.use_by_date <= today && !i.category.includes('Reserved'));
    
    const alertBox = document.getElementById('alerts-container');
    if (expired.length > 0) {
        alertBox.innerHTML = `<div class="alert-banner">⚠️ Mum! You have ${expired.length} item(s) expiring today or already overdue! Check the Dates tab.</div>`;
    } else {
        alertBox.innerHTML = '';
    }
}
