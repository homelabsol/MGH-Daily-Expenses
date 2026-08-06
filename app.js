// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD4bJL8y0K0Kb3cKFA2Dm_OlDoPeTeo6MtiRzB_B8WBeX7GiU0gU2EBVAwd31BMPWV/exec';

function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let allValidationRecords = []; // Global scope for validation records

/* ===== Toast System ===== */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info} toast-icon"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

/* ===== Custom Confirmation Modal ===== */
function showConfirm(title, message, onConfirm) {
    const overlay = document.getElementById('confirm-modal-overlay');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl   = document.getElementById('confirm-modal-message');
    const okBtn   = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    if (!overlay) { if (onConfirm) onConfirm(); return; }
    titleEl.textContent = title;
    msgEl.textContent   = message;
    overlay.classList.remove('hidden');
    const close = () => overlay.classList.add('hidden');
    const handleOk = () => { close(); okBtn.removeEventListener('click', handleOk); cancelBtn.removeEventListener('click', handleCancel); if (onConfirm) onConfirm(); };
    const handleCancel = () => { close(); okBtn.removeEventListener('click', handleOk); cancelBtn.removeEventListener('click', handleCancel); };
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}


document.addEventListener('DOMContentLoaded', () => {
    const cashForm = document.getElementById('cash-expense-form');
    const cashSubmitBtn = document.getElementById('cash-submit-btn');
    const cashStatusMessage = document.getElementById('cash-status-message');

    const gcashForm = document.getElementById('gcash-expense-form');
    const gcashSubmitBtn = document.getElementById('gcash-submit-btn');
    const gcashStatusMessage = document.getElementById('gcash-status-message');

    const receivableForm = document.getElementById('gcash-receivable-form');
    const receivableSubmitBtn = document.getElementById('receivable-submit-btn');
    const receivableStatusMessage = document.getElementById('receivable-status-message');

    const remitForm = document.getElementById('remitted-amount-form');
    const remitSubmitBtn = document.getElementById('remit-submit-btn');
    const remitStatusMessage = document.getElementById('remit-status-message');

    const accountForm = document.getElementById('create-account-form');
    const accountSubmitBtn = document.getElementById('acc-submit-btn');
    const accountStatusMessage = document.getElementById('acc-status-message');

    // Login Elements
    const loginContainer = document.getElementById('login-container');
    const mainMenuContainer = document.getElementById('main-menu-container');
    const expensesContainer = document.getElementById('expenses-container');
    const adminContainer = document.getElementById('admin-container');
    const reportContainer = document.getElementById('report-container');
    const dailySurveyContainer = document.getElementById('daily-survey-container');
    const warrantyContainer = document.getElementById('warranty-container');
    const handoverContainer = document.getElementById('handover-container');
    
    const loginForm = document.getElementById('login-form');
    const loginSubmitBtn = document.getElementById('login-btn');
    const loginStatusMessage = document.getElementById('login-status-message');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');

    // Admin Verification Elements
    const adminLoginSection = document.getElementById('admin-login-section');
    const adminContent = document.getElementById('admin-content');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminErrorMessage = document.getElementById('admin-error-message');

    // Menu Buttons
    const menuAdminBtn = document.getElementById('menu-admin-btn');
    const menuExpensesBtn = document.getElementById('menu-expenses-btn');
    const menuReportBtn = document.getElementById('menu-report-btn');
    const menuSurveyBtn = document.getElementById('menu-survey-btn');
    const menuHandoverBtn = document.getElementById('menu-handover-btn');
    const menuWarrantyBtn = document.getElementById('menu-warranty-btn');
    const backBtns = document.querySelectorAll('.back-btn');

    // Check if user is already logged in
    const sessionUser = sessionStorage.getItem('loggedInUser');
    if (sessionUser) {
        showApp(sessionUser);
    }

    function hideAllContainers() {
        // Hides every top-level screen/modal in one pass instead of a hardcoded id list.
        document.querySelectorAll('.container').forEach(function(el) {
            el.classList.add('hidden');
        });
        // These two legacy elements act as containers but don't carry the .container
        // class (their full-screen overlay styling depends on not inheriting it),
        // so they're hidden explicitly to keep behavior identical to before.
        var editRecordsModal = document.getElementById('edit-records-modal');
        if (editRecordsModal) editRecordsModal.classList.add('hidden');
        var itemReplacementFormContainer = document.getElementById('item-replacement-form-container');
        if (itemReplacementFormContainer) itemReplacementFormContainer.classList.add('hidden');
    }
    window.hideAllContainers = hideAllContainers;

    function showApp(name) {
        hideAllContainers();
        mainMenuContainer.classList.remove('hidden');
        welcomeMessage.textContent = `Welcome, ${name}`;
        
        // Update user display in all screens
        document.querySelectorAll('.logged-in-user-display').forEach(el => {
            el.textContent = `Logged in as: ${name}`;
        });
        
        // Hide/Show Expenses based on Role and Store
        const role = sessionStorage.getItem('userRole') || '';
        const store = sessionStorage.getItem('userStore') || '';
        const menuExpensesBtn = document.getElementById('menu-expenses-btn');
        if (menuExpensesBtn) {
            if (role === 'RMA Admin' || store === 'MarvsPCStufz') {
                menuExpensesBtn.style.display = 'none';
            } else {
                menuExpensesBtn.style.display = ''; 
            }
        }

        // Hide/Show Staff Report based on Role and Store
        const btnStaffReport = document.getElementById('btn-staff-report');
        if (btnStaffReport) {
            const isAllowedRole = (role === 'Manager' || role === 'Owner' || role === 'Auditor');
            const isAllowedStore = (store === 'MGH Parang' || store === 'MGH Concepcion' || store === 'Auditor');
            
            if (isAllowedRole || isAllowedStore) {
                btnStaffReport.style.display = '';
            } else {
                btnStaffReport.style.display = 'none';
            }
        }

        // Hide/Show Daily Survey and Daily Handover based on Store
        const menuSurveyBtn = document.getElementById('menu-survey-btn');
        const menuHandoverBtn = document.getElementById('menu-handover-btn');
        if (menuSurveyBtn) {
            menuSurveyBtn.style.display = (store === 'MarvsPCStufz') ? 'none' : '';
        }
        if (menuHandoverBtn) {
            menuHandoverBtn.style.display = (store === 'MarvsPCStufz') ? 'none' : '';
        }
        
        // Hide/Show MarvsPCStufz Button based on Store and Role
        const menuMarvsPcBtnApp = document.getElementById('menu-marvspc-btn');
        if (menuMarvsPcBtnApp) {
            const isMarvsPcStore = (store === 'MarvsPCStufz');
            const isOwner = (role === 'Owner');
            const isAllowedRole = (role === 'Manager' || role === 'RMA Admin');

            // Owner always sees it; Manager/RMA Admin also see it regardless of store
            if (isOwner || isAllowedRole) {
                menuMarvsPcBtnApp.style.display = '';
            } else {
                menuMarvsPcBtnApp.style.display = 'none';
            }
        }
    }

    function showLogin() {
        hideAllContainers();
        loginContainer.classList.remove('hidden');
        loginForm.reset();
        welcomeMessage.textContent = 'MGH Daily Expenses';
    }

    // Navigation Listeners
    const menuMarvsPcBtn = document.getElementById('menu-marvspc-btn');
    if (menuMarvsPcBtn) {
        menuMarvsPcBtn.addEventListener('click', () => {
            hideAllContainers();
            const marvsPcContainer = document.getElementById('marvspc-menu-container');
            if (marvsPcContainer) marvsPcContainer.classList.remove('hidden');
        });
    }

    const menuMghBtn = document.getElementById('menu-mgh-btn');
    if (menuMghBtn) {
        menuMghBtn.addEventListener('click', () => {
            hideAllContainers();
            const mghContainer = document.getElementById('mgh-menu-container');
            if (mghContainer) mghContainer.classList.remove('hidden');
        });
    }

    const menuMarvsPcExpensesBtn = document.getElementById('menu-marvspc-expenses-btn');
    if (menuMarvsPcExpensesBtn) {
        menuMarvsPcExpensesBtn.addEventListener('click', () => {
            hideAllContainers();
            const marvspcExpensesContainer = document.getElementById('marvspc-expenses-container');
            if (marvspcExpensesContainer) marvspcExpensesContainer.classList.remove('hidden');
            const marvspcDate = document.getElementById('marvspc-date');
            if (marvspcDate) marvspcDate.valueAsDate = new Date();
        });
    }

    menuAdminBtn.addEventListener('click', () => {
        hideAllContainers();
        adminContainer.classList.remove('hidden');
        
        // Reset admin UI state
        adminLoginSection.classList.remove('hidden');
        adminContent.classList.add('hidden');
        adminErrorMessage.classList.add('hidden');
        adminLoginForm.reset();
        
        // Pre-fill the username if we want, or leave it blank.
        // Let's pre-fill the username to make it easier
        const currentSessionUser = sessionStorage.getItem('loggedInUser');
        if (currentSessionUser) {
            document.getElementById('admin-login-username').value = currentSessionUser;
        }
    });

    menuExpensesBtn.addEventListener('click', () => {
        hideAllContainers();
        expensesContainer.classList.remove('hidden');
    });

    if (menuReportBtn) {
        menuReportBtn.addEventListener('click', () => {
            hideAllContainers();
            reportContainer.classList.remove('hidden');
            // FIX: Always reset to main menu
            hideAllReportSections();
            reportMainMenu.classList.remove('hidden');
        });
    }

    if (menuSurveyBtn) {
        menuSurveyBtn.addEventListener('click', () => {
            hideAllContainers();
            dailySurveyContainer.classList.remove('hidden');
            document.getElementById('survey-date').valueAsDate = new Date();
            document.getElementById('report-survey-date').valueAsDate = new Date();
        });
    }

    if (menuWarrantyBtn) {
        menuWarrantyBtn.addEventListener('click', () => {
            hideAllContainers();
            document.getElementById('warranty-menu-container').classList.remove('hidden');
        });
    }

    const menuPurchasedBtn = document.getElementById('menu-purchased-btn');
    if (menuPurchasedBtn) {
        menuPurchasedBtn.addEventListener('click', () => {
            const currentRole = sessionStorage.getItem('userRole');
            if (currentRole !== 'RMA Admin' && currentRole !== 'Manager' && currentRole !== 'Owner') {
                alert('Access Denied. Only RMA Admin, Manager, or Owner can access Purchased Items.');
                return;
            }
            hideAllContainers();
            document.getElementById('purchased-items-container').classList.remove('hidden');
            document.getElementById('purchased-date').valueAsDate = new Date();
            const accountableInput = document.getElementById('purchased-accountable');
            if (accountableInput && !accountableInput.value) {
                accountableInput.value = sessionStorage.getItem('loggedInUser') || '';
            }
            loadCategoryDropdown();
            loadSupplierDropdown();
        });
    }

    async function loadSupplierDropdown() {
        const sel = document.getElementById('purchased-supplier');
        if (!sel) return;
        sel.innerHTML = '<option value="" disabled selected>Loading...</option>';
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'getItemSuppliers' })
            });
            const data = await res.json();
            sel.innerHTML = '<option value="" disabled selected>Select Supplier</option>';
            const editSel = document.getElementById('edit-supplier-filter');
            if (editSel) editSel.innerHTML = '<option value="All">All Suppliers</option>';
            if (data.status === 'success' && data.data && data.data.length > 0) {
                data.data.forEach(sup => {
                    const opt = document.createElement('option');
                    opt.value = sup;
                    opt.textContent = sup;
                    sel.appendChild(opt);
                    if (editSel) {
                        const opt2 = document.createElement('option');
                        opt2.value = sup;
                        opt2.textContent = sup;
                        editSel.appendChild(opt2);
                    }
                });
            } else if (data.status === 'error') {
                sel.innerHTML = `<option value="" disabled selected>Error: ${data.message}</option>`;
            } else {
                sel.innerHTML = '<option value="" disabled selected>No suppliers found</option>';
            }
        } catch (e) {
            sel.innerHTML = '<option value="" disabled selected>Failed to load</option>';
        }
    }

    async function loadCategoryDropdown() {
        const sel = document.getElementById('purchased-category');
        if (!sel) return;
        sel.innerHTML = '<option value="" disabled selected>Loading...</option>';
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'getItemCategories' })
            });
            const data = await res.json();
            sel.innerHTML = '<option value="" disabled selected>Select Category</option>';
            const editSel = document.getElementById('edit-category-filter');
            if (editSel) editSel.innerHTML = '<option value="All">All Categories</option>';
            if (data.status === 'success' && data.data && data.data.length > 0) {
                data.data.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    sel.appendChild(opt);
                    if (editSel) {
                        const opt2 = document.createElement('option');
                        opt2.value = cat;
                        opt2.textContent = cat;
                        editSel.appendChild(opt2);
                    }
                });
            } else if (data.status === 'error') {
                sel.innerHTML = `<option value="" disabled selected>Error: ${data.message}</option>`;
            } else {
                sel.innerHTML = '<option value="" disabled selected>No categories found</option>';
            }
        } catch (e) {
            sel.innerHTML = '<option value="" disabled selected>Failed to load</option>';
        }
    }

    // Purchased Items Form Submit
    const purchasedItemsForm = document.getElementById('purchased-items-form');
    if (purchasedItemsForm) {
        purchasedItemsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('purchased-date').value;
            const supplierName = document.getElementById('purchased-supplier').value;
            const itemCategory = document.getElementById('purchased-category').value;
            const itemDescription = document.getElementById('purchased-item-desc').value;
            const serialNumber = document.getElementById('purchased-serial').value;
            const status = document.getElementById('purchased-status').value;
            const accountablePerson = document.getElementById('purchased-accountable').value;

            const btnSave = document.getElementById('btn-save-purchased');
            const btnText = btnSave.querySelector('.btn-text');
            const spinner = btnSave.querySelector('.spinner');
            const statusMessage = document.getElementById('purchased-status-message');

            btnSave.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            try {
                const formData = {
                    action: 'savePurchasedItem',
                    date: date,
                    supplierName: supplierName,
                    itemCategory: itemCategory,
                    itemDescription: itemDescription,
                    serialNumber: serialNumber,
                    status: status,
                    accountablePerson: accountablePerson,
                    encodedBy: sessionStorage.getItem('loggedInUser')
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (result.status === 'success') {
                    statusMessage.textContent = 'Purchased item saved successfully!';
                    statusMessage.className = 'status-message success';
                    statusMessage.classList.remove('hidden');
                    purchasedItemsForm.reset();
                    document.getElementById('purchased-date').valueAsDate = new Date();
                    const accountableInput = document.getElementById('purchased-accountable');
                    if (accountableInput) accountableInput.value = sessionStorage.getItem('loggedInUser') || '';
                } else {
                    statusMessage.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    statusMessage.className = 'status-message error';
                    statusMessage.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error saving purchased item:', error);
                statusMessage.textContent = 'Network error. Please try again.';
                statusMessage.className = 'status-message error';
                statusMessage.classList.remove('hidden');
            } finally {
                btnSave.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    const btnUploadMultiplePurchased = document.getElementById('btn-upload-multiple-purchased');
    const purchasedCsvUpload = document.getElementById('purchased-csv-upload');

    if (btnUploadMultiplePurchased && purchasedCsvUpload) {
        btnUploadMultiplePurchased.addEventListener('click', () => {
            purchasedCsvUpload.click();
        });

        purchasedCsvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const btnText = btnUploadMultiplePurchased.querySelector('.btn-text');
            const originalText = btnText.innerHTML;
            btnUploadMultiplePurchased.disabled = true;
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const text = event.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                    const items = [];
                    
                    // Start from index 1 to skip header if it exists
                    let startIndex = 0;
                    if (lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('supplier')) {
                        startIndex = 1;
                    }

                    for (let i = startIndex; i < lines.length; i++) {
                        // Regex to handle commas inside quotes
                        const row = lines[i].match(/(\s*"[^"]+"\s*|\s*[^,]+|,)(?=,|$)/g);
                        if (!row) continue;
                        
                        const cleanRow = row.map(val => {
                            let v = val.trim();
                            if (v.startsWith('"') && v.endsWith('"')) {
                                v = v.substring(1, v.length - 1).trim();
                            }
                            if (v === ',') return '';
                            if (v.endsWith(',')) v = v.slice(0, -1);
                            return v;
                        });

                        // Expected format: Date, Supplier, Category, Description, Serial, Status, Accountable
                        let rawDate = cleanRow[0] || '';
                        let formattedDate = rawDate;
                        if (rawDate) {
                            const d = new Date(rawDate);
                            if (!isNaN(d)) {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                formattedDate = `${y}-${m}-${day}`;
                            }
                        }

                        items.push({
                            date: formattedDate,
                            supplierName: cleanRow[1] || '',
                            itemCategory: cleanRow[2] || '',
                            itemDescription: cleanRow[3] || '',
                            serialNumber: cleanRow[4] || '',
                            status: cleanRow[5] || '',
                            accountablePerson: cleanRow[6] || ''
                        });
                    }

                    if (items.length === 0) {
                        alert("No valid data found in CSV.");
                        return;
                    }

                    const formData = {
                        action: 'saveMultiplePurchasedItems',
                        items: items,
                        encodedBy: sessionStorage.getItem('loggedInUser')
                    };

                    const response = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(formData)
                    });
                    
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        alert(`Successfully uploaded ${items.length} items!`);
                    } else {
                        alert('Error: ' + (result.message || 'Failed to save items.'));
                    }

                } catch (err) {
                    console.error("CSV parse/upload error:", err);
                    alert("Error parsing or uploading CSV: " + err.message);
                } finally {
                    btnUploadMultiplePurchased.disabled = false;
                    btnText.innerHTML = originalText;
                    purchasedCsvUpload.value = ''; // Reset input
                }
            };
            reader.readAsText(file);
        });
    }

    // Category & Supplier Modal Logic
    const categoryModal = document.getElementById('category-modal');
    const supplierModal = document.getElementById('supplier-modal');

    const btnPurchasedCategory = document.getElementById('btn-purchased-category');
    if (btnPurchasedCategory) {
        btnPurchasedCategory.addEventListener('click', () => {
            document.getElementById('category-name-input').value = '';
            const msg = document.getElementById('category-modal-message');
            msg.style.display = 'none';
            categoryModal.style.display = 'flex';
        });
    }
    document.getElementById('close-category-modal')?.addEventListener('click', () => { categoryModal.style.display = 'none'; });
    document.getElementById('cancel-category-modal')?.addEventListener('click', () => { categoryModal.style.display = 'none'; });

    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryName = document.getElementById('category-name-input').value.trim();
            if (!categoryName) return;
            const btn = document.getElementById('btn-save-category');
            const msg = document.getElementById('category-modal-message');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'saveItemCategory', categoryName: categoryName, encodedBy: sessionStorage.getItem('loggedInUser') })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    msg.textContent = 'Category saved successfully!';
                    msg.style.display = 'block';
                    msg.style.background = 'rgba(16,185,129,0.15)';
                    msg.style.color = '#10b981';
                    msg.style.border = '1px solid rgba(16,185,129,0.3)';
                    document.getElementById('category-name-input').value = '';
                    setTimeout(() => { categoryModal.style.display = 'none'; loadCategoryDropdown(); }, 1200);
                } else {
                    msg.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    msg.style.display = 'block';
                    msg.style.background = 'rgba(239,68,68,0.15)';
                    msg.style.color = '#ef4444';
                    msg.style.border = '1px solid rgba(239,68,68,0.3)';
                }
            } catch (err) {
                msg.textContent = 'Network error. Please try again.';
                msg.style.display = 'block';
                msg.style.background = 'rgba(239,68,68,0.15)';
                msg.style.color = '#ef4444';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Category';
            }
        });
    }

    const btnPurchasedSupplier = document.getElementById('btn-purchased-supplier');
    if (btnPurchasedSupplier) {
        btnPurchasedSupplier.addEventListener('click', () => {
            document.getElementById('supplier-name-input').value = '';
            const msg = document.getElementById('supplier-modal-message');
            msg.style.display = 'none';
            supplierModal.style.display = 'flex';
        });
    }
    document.getElementById('close-supplier-modal')?.addEventListener('click', () => { supplierModal.style.display = 'none'; });
    document.getElementById('cancel-supplier-modal')?.addEventListener('click', () => { supplierModal.style.display = 'none'; });

    const supplierModalForm = document.getElementById('supplier-modal-form');
    if (supplierModalForm) {
        supplierModalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const supplierName = document.getElementById('supplier-name-input').value.trim();
            if (!supplierName) return;
            const btn = document.getElementById('btn-save-supplier-modal');
            const msg = document.getElementById('supplier-modal-message');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'saveItemSupplier', supplierName: supplierName, encodedBy: sessionStorage.getItem('loggedInUser') })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    msg.textContent = 'Supplier saved successfully!';
                    msg.style.display = 'block';
                    msg.style.background = 'rgba(16,185,129,0.15)';
                    msg.style.color = '#10b981';
                    msg.style.border = '1px solid rgba(16,185,129,0.3)';
                    document.getElementById('supplier-name-input').value = '';
                    setTimeout(() => { supplierModal.style.display = 'none'; loadSupplierDropdown(); }, 1200);
                } else {
                    msg.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    msg.style.display = 'block';
                    msg.style.background = 'rgba(239,68,68,0.15)';
                    msg.style.color = '#ef4444';
                    msg.style.border = '1px solid rgba(239,68,68,0.3)';
                }
            } catch (err) {
                msg.textContent = 'Network error. Please try again.';
                msg.style.display = 'block';
                msg.style.background = 'rgba(239,68,68,0.15)';
                msg.style.color = '#ef4444';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Supplier';
            }
        });
    }
    const btnWarrantyRecords = document.getElementById('btn-warranty-records');
    if (btnWarrantyRecords) {
        btnWarrantyRecords.addEventListener('click', async () => {
            hideAllContainers();
            warrantyContainer.classList.remove('hidden');
            document.getElementById('warranty-date').valueAsDate = new Date();
            
            // Auto-generate Warranty Number
            const generateWarrantyNumber = () => {
                const now = new Date();
                const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
                return `WAR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${randomStr}`;
            };
            document.getElementById('warranty-number').value = generateWarrantyNumber();
            document.getElementById('warranty-row-index').value = '';
            
            const role = sessionStorage.getItem('userRole');
            const statusGroup = document.getElementById('warranty-status-group');
            const saveBtn = document.getElementById('btn-save-warranty');
            const statusSelect = document.getElementById('warranty-status');
            const approverInput = document.getElementById('warranty-approver');
            
            if (statusGroup) statusGroup.style.display = 'block';
            if (saveBtn) saveBtn.style.display = 'block';
            
            if (role === 'Supervisor' || role === 'Manager' || role === 'Owner') {
                if (statusSelect) statusSelect.disabled = false;
                if (approverInput) approverInput.value = sessionStorage.getItem('loggedInUser') || '';
            } else {
                if (statusSelect) {
                    statusSelect.value = 'Pending';
                    statusSelect.disabled = true;
                }
                if (approverInput) approverInput.value = '';
            }
            
            // Populate technician options
            try {
                const techSelect = document.getElementById('warranty-tech');
                techSelect.innerHTML = '<option value="" disabled selected>Loading technicians...</option>';
                
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'getTechnicians' })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    techSelect.innerHTML = '<option value="" disabled selected>Select Technician</option>';
                    if (result.data && result.data.length > 0) {
                        result.data.forEach(tech => {
                            const option = document.createElement('option');
                            option.value = tech;
                            option.textContent = tech;
                            techSelect.appendChild(option);
                        });
                    } else {
                        techSelect.innerHTML = '<option value="" disabled selected>No technicians found</option>';
                    }
                } else {
                    techSelect.innerHTML = '<option value="" disabled selected>Failed to load technicians</option>';
                }
            } catch (error) {
                console.error('Error fetching technicians:', error);
                document.getElementById('warranty-tech').innerHTML = '<option value="" disabled selected>Error connecting</option>';
            }
        });
    }

    // ======= Warranty Validation Logic =======
    const valTableBody = document.getElementById('val-records-tbody');
    const valTheadTr = document.getElementById('val-records-thead-tr');
    
    const renderValidationTable = () => {
        if (!valTableBody || !valTheadTr) return;
        
        const branchFilter = document.getElementById('val-branch').value;
        const statusFilter = document.getElementById('val-status-filter') ? document.getElementById('val-status-filter').value : 'All';
        const searchFilter = document.getElementById('val-search-warranty').value.toLowerCase();
        
        // Define columns directly since sheetColumns is scoped elsewhere
        const cols = ['Date', 'Branch', 'Tech', 'Item Description', 'Serial#', 'PC#', 'Qty', 'Issue and Concern', 'Sup Approver', 'Status', 'Warranty#'];
        
        // Render headers and support sort toggles
        valTheadTr.innerHTML = '';
        if (window.valSortDesc === undefined) window.valSortDesc = true; // Default sorting
        
        let theadHTML = '';
        cols.forEach(col => {
            if (col === 'Date') {
                const icon = window.valSortDesc ? '<i class="fas fa-sort-down"></i>' : '<i class="fas fa-sort-up"></i>';
                theadHTML += `<th id="val-sort-date" style="padding: 12px 8px; cursor: pointer; user-select: none;">${col} ${icon}</th>`;
            } else {
                theadHTML += `<th style="padding: 12px 8px;">${col}</th>`;
            }
        });
        theadHTML += `<th style="padding: 12px 8px;">Actions</th>`;
        valTheadTr.innerHTML = theadHTML;
        
        const valSortDateBtn = document.getElementById('val-sort-date');
        if (valSortDateBtn) {
            valSortDateBtn.addEventListener('click', () => {
                window.valSortDesc = !window.valSortDesc;
                renderValidationTable();
            });
        }

        valTableBody.innerHTML = '';
        
        // Filter records
        const filteredRecords = allValidationRecords.filter(row => {
            const branch = row[1] || ''; // Branch is column index 1
            const status = row[9] || ''; // Status is column index 9
            const warrantyNum = row[10] || ''; // Warranty# is column index 10
            
            const matchBranch = branchFilter === 'All' || branch === branchFilter;
            const matchStatus = statusFilter === 'All' || status === statusFilter;
            const matchSearch = String(warrantyNum).toLowerCase().includes(searchFilter);
            
            return matchBranch && matchStatus && matchSearch;
        });

        // Sort filteredRecords by Date
        filteredRecords.sort((a, b) => {
            const dateA = new Date(a[0] || 0).getTime(); // Date is column index 0
            const dateB = new Date(b[0] || 0).getTime();
            return window.valSortDesc ? dateB - dateA : dateA - dateB;
        });

        if (filteredRecords.length === 0) {
            valTableBody.innerHTML = `<tr><td colspan="${cols.length + 1}" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found matching filters.</td></tr>`;
            return;
        }

        filteredRecords.forEach(row => {
            const rowIndex = row[row.length - 1]; // rowIndex is the last element
            
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            for(let i=0; i<cols.length; i++) {
                const td = document.createElement('td');
                td.style.padding = '8px';
                
                let val = row[i];
                if (val === undefined || val === null) val = '';
                
                // formatDate 
                if (cols[i].toLowerCase().includes('date') && val !== '') {
                    const d = new Date(val);
                    if(!isNaN(d)) val = d.toISOString().split('T')[0];
                }
                
                const inputEl = document.createElement('div');
                inputEl.innerText = val;
                inputEl.className = `edit-input-${rowIndex}`;
                inputEl.style.cssText = 'background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 4px 6px; color: inherit; width: 100%; min-width: 150px; outline: none; font-family: inherit; font-size: 0.95em; box-sizing: border-box; word-break: break-word; white-space: pre-wrap;';
                
                td.appendChild(inputEl);
                tr.appendChild(td);
            }
            
            // Action cell
            const actionTd = document.createElement('td');
            actionTd.style.padding = '8px';
            actionTd.style.whiteSpace = 'nowrap';
            
            const modifyBtn = document.createElement('button');
            modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modify/Edit';
            modifyBtn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-right: 5px;';
            modifyBtn.addEventListener('click', () => {
                try {
                    document.getElementById('warranty-validation-container').classList.add('hidden');
                    document.getElementById('warranty-validation-form-container').classList.remove('hidden');
                    
                    document.getElementById('val-form-row-index').value = rowIndex;
                    
                    // Store the original row data to preserve columns A-J when saving
                    document.getElementById('warranty-validation-form').dataset.rowData = JSON.stringify(row);
                    
                    // Populate fields (indices 10 to 16) and read-only context (indices 3 and 7)
                    document.getElementById('val-form-warranty-number-display').innerText = row[10] || '';
                    document.getElementById('val-form-warranty-number').value = row[10] || '';
                    document.getElementById('val-form-item-desc').innerText = row[3] || '';
                    document.getElementById('val-form-issue').innerText = row[7] || '';
                    
                    document.getElementById('val-form-received-date').value = (row[11] || '').split('T')[0];
                    
                    const rmaOfficeEl = document.getElementById('val-form-rma-office');
                    const loggedInUser = sessionStorage.getItem('loggedInUser');
                    let userExists = false;
                    for (let i = 0; i < rmaOfficeEl.options.length; i++) {
                        if (rmaOfficeEl.options[i].value === loggedInUser) userExists = true;
                    }
                    if (!userExists && loggedInUser) {
                        const opt = document.createElement('option');
                        opt.value = loggedInUser;
                        opt.textContent = loggedInUser;
                        rmaOfficeEl.appendChild(opt);
                    }
                    rmaOfficeEl.value = loggedInUser || '';
                    rmaOfficeEl.disabled = true;

                    document.getElementById('val-form-status').value = row[13] || 'Pending';
                    document.getElementById('val-form-assigned-tech').value = row[14] || '';
                    document.getElementById('val-form-remarks').value = row[15] || '';
                    document.getElementById('val-form-replacement-date').value = (row[16] || '').split('T')[0];
                } catch(err) {
                    console.error('Error opening modify modal:', err);
                }
            });

            const printRowBtn = document.createElement('button');
            printRowBtn.innerHTML = '<i class="fas fa-print"></i> Print';
            printRowBtn.style.cssText = 'background: rgba(255, 255, 255, 0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;';
            
            printRowBtn.addEventListener('click', () => {
                const originalText = printRowBtn.innerHTML;
                printRowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                printRowBtn.disabled = true;

                const newTab = window.open('', '_blank');
                if (newTab) {
                    newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating Single Record PDF...</h3>');
                } else {
                    alert('Popup blocked!');
                }

                try {
                    let htmlRows = '';
                    for(let i=0; i<cols.length; i++) {
                        let colVal = row[i];
                        if (colVal === undefined || colVal === null) colVal = '';
                        
                        // Use updated innerText from the cell just in case
                        const inputs = tr.querySelectorAll(`.edit-input-${rowIndex}`);
                        if(inputs && inputs[i]) colVal = inputs[i].innerText;

                        htmlRows += `
                            <tr style="border-bottom: 1px solid #cbd5e1;">
                                <th style="padding: 10px; background: #f8fafc; color: #475569; width: 35%; text-align: left; vertical-align: top;">${cols[i]}</th>
                                <td style="padding: 10px; color: #0f172a; white-space: pre-wrap; word-wrap: break-word; text-align: left;">${colVal}</td>
                            </tr>
                        `;
                    }

                    const htmlString = `
                        <div style="font-family: sans-serif; color: #333; padding: 30px; background: white; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
                                <h2 style="margin: 0 0 5px 0; color: #1e293b; font-size: 22px;">Warranty Items Details</h2>
                                <p style="margin: 0; color: #64748b; font-size: 12px;">Printed on ${new Date().toLocaleString()}</p>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <tbody>
                                    ${htmlRows}
                                </tbody>
                            </table>
                        </div>
                    `;

                    const hiddenDiv = document.createElement('div');
                    hiddenDiv.innerHTML = htmlString;
                    hiddenDiv.style.position = 'absolute';
                    hiddenDiv.style.top = '-9999px';
                    hiddenDiv.style.left = '-9999px';
                    hiddenDiv.style.width = '800px'; 
                    document.body.appendChild(hiddenDiv);
                    
                    const element = hiddenDiv.firstElementChild;
                    html2pdf().set({
                        margin: 10,
                        filename: `Warranty_Items_Record_${rowIndex}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    }).from(element).output('bloburl').then(function(pdfUrl) {
                        if (newTab) newTab.location.href = pdfUrl;
                        document.body.removeChild(hiddenDiv);
                        printRowBtn.innerHTML = originalText;
                        printRowBtn.disabled = false;
                    }).catch(function(error) {
                        console.error('PDF generation error:', error);
                        newTab.close();
                        alert('Error generating PDF.');
                        document.body.removeChild(hiddenDiv);
                        printRowBtn.innerHTML = originalText;
                        printRowBtn.disabled = false;
                    });
                } catch(err) {
                    console.error(err);
                    newTab.close();
                    printRowBtn.innerHTML = originalText;
                    printRowBtn.disabled = false;
                }
            });

            actionTd.appendChild(modifyBtn);
            actionTd.appendChild(printRowBtn);
            
            tr.appendChild(actionTd);
            valTableBody.appendChild(tr);
        });
    };

    const loadValidationRecords = async () => {
        const refreshBtn = document.getElementById('btn-val-refresh');
        const btnText = refreshBtn.querySelector('.btn-text');
        const spinner = refreshBtn.querySelector('.spinner');
        
        refreshBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        
        valTableBody.innerHTML = `<tr><td colspan="12" style="padding: 15px; text-align: center; color: var(--text-muted);">Loading warranty validation records... <i class="fas fa-spinner fa-spin"></i></td></tr>`;
        
        try {
            const formData = {
                action: 'getExpenseRecords',
                sheetName: 'Warranty Items',
                startDate: '2020-01-01',
                endDate: '2099-12-31',
                branch: 'All'
            };
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                allValidationRecords = result.data;
                renderValidationTable();
            } else {
                valTableBody.innerHTML = `<tr><td colspan="12" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error fetching validation records:', error);
            valTableBody.innerHTML = `<tr><td colspan="12" style="padding: 15px; text-align: center; color: #ef4444;">Connection error. Could not load records.</td></tr>`;
        } finally {
            refreshBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    };

    const loadRmaAdmins = async () => {
        try {
            const rmaOfficeSelect = document.getElementById('val-form-rma-office');
            if (!rmaOfficeSelect || rmaOfficeSelect.options.length > 1) return; // already loaded or loading failed

            rmaOfficeSelect.innerHTML = '<option value="" disabled selected>Loading RMA Admins...</option>';
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'getRmaAdmins' })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                rmaOfficeSelect.innerHTML = '<option value="" disabled selected>Select RMA Officer</option>';
                if (result.data && result.data.length > 0) {
                    result.data.forEach(admin => {
                        const option = document.createElement('option');
                        option.value = admin;
                        option.textContent = admin;
                        rmaOfficeSelect.appendChild(option);
                    });
                } else {
                    rmaOfficeSelect.innerHTML = '<option value="" disabled selected>No RMA Admins found</option>';
                }
            } else {
                rmaOfficeSelect.innerHTML = '<option value="" disabled selected>Failed to load RMA Admins</option>';
            }
        } catch (error) {
            console.error('Error fetching RMA Admins:', error);
            document.getElementById('val-form-rma-office').innerHTML = '<option value="" disabled selected>Error connecting</option>';
        }
    };

    const btnWarrantyValidation = document.getElementById('btn-warranty-validation');
    if (btnWarrantyValidation) {
        btnWarrantyValidation.addEventListener('click', () => {
            const currentRole = sessionStorage.getItem('userRole');
            if (currentRole !== 'Owner' && currentRole !== 'Manager' && currentRole !== 'RMA Admin') {
                alert('Access Denied. Only Owner, Manager, and RMA Admin can access Warranty Validation.');
                return;
            }
            hideAllContainers();
            document.getElementById('warranty-validation-container').classList.remove('hidden');
            loadRmaAdmins();
            loadValidationRecords();
        });
    }

            const btnItemReplacement = document.getElementById('btn-item-replacement');
    if (btnItemReplacement) {
        btnItemReplacement.addEventListener('click', () => {
            const currentRole = sessionStorage.getItem('userRole');
            if (currentRole !== 'Owner' && currentRole !== 'Manager' && currentRole !== 'Supervisor') {
                alert('Access Denied. Only Owner, Manager, and Supervisor can access Item Replacement.');
                return;
            }
            hideAllContainers();
            document.getElementById('item-replacement-container').classList.remove('hidden');
        });
    }

    // Attach listeners for live filtering
    const valSearchInput = document.getElementById('val-search-warranty');
    const valBranchSelect = document.getElementById('val-branch');
    const valStatusSelect = document.getElementById('val-status-filter');
    const valRefreshBtn = document.getElementById('btn-val-refresh');
    
    if (valSearchInput) valSearchInput.addEventListener('input', renderValidationTable);
    if (valBranchSelect) valBranchSelect.addEventListener('change', renderValidationTable);
    if (valStatusSelect) valStatusSelect.addEventListener('change', renderValidationTable);
    if (valRefreshBtn) valRefreshBtn.addEventListener('click', loadValidationRecords);

    backBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                hideAllContainers();
                document.getElementById(targetId).classList.remove('hidden');
                
                if (targetId === 'main-menu-container') {
                    // FIX: Reset reports to main menu for next open
                    hideAllReportSections();
                    reportMainMenu.classList.remove('hidden');
                }

                if (targetId === 'warranty-validation-container') {
                    const valForm = document.getElementById('warranty-validation-form');
                    if (valForm) valForm.reset();
                }
            }
            
            // Clear general report boxes when backing out to dashboard
            if (targetId === 'admin-reports-dashboard' || targetId === 'report-main-menu') {
                document.getElementById('recon-cash-expense').value = '₱0.00';
                document.getElementById('recon-gcash-expense').value = '₱0.00';
                document.getElementById('recon-gcash-receivable').value = '₱0.00';
                document.getElementById('recon-cash-on-hand').value = '₱0.00';
                document.getElementById('recon-pondo-amount').value = '';
                document.getElementById('recon-total-income').value = '₱0.00';
                document.getElementById('recon-discrepancy').value = '₱0.00';
                document.getElementById('recon-discrepancy').style.color = '#ef4444';
                
                // Reset internal calculation totals
                if (typeof currentReconTotals !== 'undefined') {
                    currentReconTotals.cashExpense = 0;
                    currentReconTotals.gcashExpense = 0;
                    currentReconTotals.gcashReceivable = 0;
                    currentReconTotals.cashOnHand = 0;
                }
            }
        });
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('loggedInUser');
        sessionStorage.removeItem('userRole');
        showLogin();
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(loginStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        const formData = {
            action: 'login',
            username: document.getElementById('login-username').value,
            password: document.getElementById('login-password').value
        };

        const btnText = loginSubmitBtn.querySelector('.btn-text');
        const spinner = loginSubmitBtn.querySelector('.spinner');
        loginSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        loginStatusMessage.classList.add('hidden');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                sessionStorage.setItem('loggedInUser', result.name);
                sessionStorage.setItem('userRole', result.role);
                sessionStorage.setItem('userStore', result.store || '');
                showApp(result.name);
            } else {
                showMessage(loginStatusMessage, result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(loginStatusMessage, 'Error verifying login. Check network.', 'error');
        } finally {
            loginSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Handle Admin Verification
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('admin-login-username').value;
        const password = document.getElementById('admin-login-password').value;
        
        const btnText = adminLoginBtn.querySelector('.btn-text');
        const spinner = adminLoginBtn.querySelector('.spinner');
        
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        adminLoginBtn.disabled = true;
        adminErrorMessage.classList.add('hidden');

        try {
            const formData = {
                action: 'login',
                username: username,
                password: password
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                const verifiedRole = result.role;
                if (verifiedRole === 'Owner' || verifiedRole === 'Manager') {
                    // Success! Show admin content
                    adminLoginSection.classList.add('hidden');
                    adminContent.classList.remove('hidden');
                } else {
                    // Valid credentials, but not owner/manager
                    adminErrorMessage.textContent = 'Access Denied: Only Owner or Manager can access this section.';
                    adminErrorMessage.className = 'error';
                    adminErrorMessage.classList.remove('hidden');
                }
            } else {
                adminErrorMessage.textContent = 'Invalid username or password.';
                adminErrorMessage.className = 'error';
                adminErrorMessage.classList.remove('hidden');
            }
        } catch (error) {
            adminErrorMessage.textContent = 'An error occurred. Please try again.';
            adminErrorMessage.className = 'error';
            adminErrorMessage.classList.remove('hidden');
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            adminLoginBtn.disabled = false;
        }
    });

    // Report Section Navigation
    const btnStaffReport = document.getElementById('btn-staff-report');
    const btnAdminReport = document.getElementById('btn-admin-report');
    const reportMainMenu = document.getElementById('report-main-menu');
    const staffReportContent = document.getElementById('staff-report-content');
    const adminReportContent = document.getElementById('admin-report-content');
    const adminReportsDashboard = document.getElementById('admin-reports-dashboard');
    const adminStatisticsContent = document.getElementById('admin-statistics-report-content');
    const adminAuditContent = document.getElementById('admin-audit-report-content');
    const adminSalaryContent = document.getElementById('admin-salary-expenses-content');
    const adminMonthlyContent = document.getElementById('admin-monthly-income-content');
    const adminSurveyContent = document.getElementById('admin-survey-report-content');
    const adminAttendanceReportContent = document.getElementById('admin-attendance-report-content');
    
    const reportAdminLoginSection = document.getElementById('report-admin-login-section');
    const reportBackBtns = document.querySelectorAll('.report-back-btn');
    
    const reportAdminLoginForm = document.getElementById('report-admin-login-form');
    const reportAdminLoginBtn = document.getElementById('report-admin-login-btn');
    const reportAdminErrorMessage = document.getElementById('report-admin-error-message');

    function hideAllReportSections() {
        reportMainMenu.classList.add('hidden');
        staffReportContent.classList.add('hidden');
        adminReportContent.classList.add('hidden');
        adminReportsDashboard.classList.add('hidden');
        adminStatisticsContent.classList.add('hidden');
        adminAuditContent.classList.add('hidden');
        adminSalaryContent.classList.add('hidden');
        adminMonthlyContent.classList.add('hidden');
        adminSurveyContent.classList.add('hidden');
        adminAttendanceReportContent.classList.add('hidden');
        reportAdminLoginSection.classList.add('hidden');
    }

    btnStaffReport.addEventListener('click', () => {
        hideAllReportSections();
        staffReportContent.classList.remove('hidden');
    });

    btnAdminReport.addEventListener('click', () => {
        hideAllReportSections();
        reportAdminLoginSection.classList.remove('hidden');
        reportAdminLoginForm.reset();
        reportAdminErrorMessage.classList.add('hidden');
        
        // Pre-fill username
        const currentSessionUser = sessionStorage.getItem('loggedInUser');
        if (currentSessionUser) {
            document.getElementById('report-admin-username').value = currentSessionUser;
        }
    });

    reportBackBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            hideAllReportSections();
            document.getElementById(targetId).classList.remove('hidden');
            
            // Clear general report boxes when backing out
            if (targetId === 'admin-reports-dashboard' || targetId === 'report-main-menu') {
                document.getElementById('recon-cash-expense').value = '₱0.00';
                document.getElementById('recon-gcash-expense').value = '₱0.00';
                document.getElementById('recon-gcash-receivable').value = '₱0.00';
                document.getElementById('recon-cash-on-hand').value = '₱0.00';
                document.getElementById('recon-pondo-amount').value = '';
                document.getElementById('recon-total-income').value = '₱0.00';
                document.getElementById('recon-discrepancy').value = '₱0.00';
                document.getElementById('recon-discrepancy').style.color = '#ef4444';
                
                document.getElementById('recon-remarks').value = '';
                const remarksContainer = document.getElementById('recon-remarks-container');
                if (remarksContainer) remarksContainer.classList.add('hidden');
                
                // Reset internal calculation totals
                if (typeof currentReconTotals !== 'undefined') {
                    currentReconTotals.cashExpense = 0;
                    currentReconTotals.gcashExpense = 0;
                    currentReconTotals.gcashReceivable = 0;
                    currentReconTotals.cashOnHand = 0;
                }
                
                // Clear the saved daily checks table and hide container
                const savedChecksTbody = document.getElementById('recon-saved-checks-tbody');
                if (savedChecksTbody) savedChecksTbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">No saved checks found</td></tr>';
                const container = document.getElementById('daily-sales-list-container');
                if (container) container.classList.add('hidden');
                
                // Clear and hide the monthly daily records list
                const monthlyDailyContainer = document.getElementById('monthly-daily-record-list-container');
                if (monthlyDailyContainer) monthlyDailyContainer.classList.add('hidden');
                const monthlyDailyTbody = document.querySelector('#monthly-daily-record-list-table tbody');
                if (monthlyDailyTbody) monthlyDailyTbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No records loaded.</td></tr>';
            }
        });
    });

    const closeDailySalesBtn = document.getElementById('close-daily-sales-list');
    if (closeDailySalesBtn) {
        closeDailySalesBtn.addEventListener('click', () => {
            document.getElementById('daily-sales-list-container').classList.add('hidden');
        });
    }

    // Handle Report Admin Verification
    reportAdminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('report-admin-username').value;
        const password = document.getElementById('report-admin-password').value;
        
        const btnText = reportAdminLoginBtn.querySelector('.btn-text');
        const spinner = reportAdminLoginBtn.querySelector('.spinner');
        
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        reportAdminLoginBtn.disabled = true;
        reportAdminErrorMessage.classList.add('hidden');

        try {
            const formData = {
                action: 'login',
                username: username,
                password: password
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                const verifiedRole = result.role;
                if (verifiedRole === 'Owner' || verifiedRole === 'Manager' || verifiedRole.toLowerCase() === 'auditor') {
                    // Update session storage so subsequent actions are logged under this user
                    sessionStorage.setItem('loggedInUser', result.name);
                    sessionStorage.setItem('userRole', result.role);
                    sessionStorage.setItem('userStore', result.store || '');
                    
                    // Update UI text globally
                    document.querySelectorAll('.logged-in-user-display').forEach(el => {
                        el.textContent = `Logged in as: ${result.name}`;
                    });

                    // Success! Show admin report dashboard
                    reportAdminLoginSection.classList.add('hidden');
                    adminReportsDashboard.classList.remove('hidden');
                    
                    // Hide restricted buttons if auditor
                    const isAuditor = (verifiedRole.toLowerCase() === 'auditor');
                    document.getElementById('btn-admin-statistics-report').style.display = isAuditor ? 'none' : '';
                    document.getElementById('btn-admin-audit-report').style.display = isAuditor ? 'none' : '';
                    document.getElementById('btn-admin-salary-expenses').style.display = isAuditor ? 'none' : '';
                    document.getElementById('btn-admin-survey-report').style.display = isAuditor ? 'none' : '';
                    document.getElementById('btn-admin-attendance-report').style.display = isAuditor ? 'none' : '';
                    document.getElementById('btn-admin-monthly-income').style.display = isAuditor ? 'none' : '';
                } else {
                    // Valid credentials, but not allowed
                    reportAdminErrorMessage.textContent = 'Access Denied: Only Owner, Manager, or Auditor can access Admin Reports.';
                    reportAdminErrorMessage.className = 'error';
                    reportAdminErrorMessage.classList.remove('hidden');
                }
            } else {
                reportAdminErrorMessage.textContent = 'Invalid username or password.';
                reportAdminErrorMessage.className = 'error';
                reportAdminErrorMessage.classList.remove('hidden');
            }
        } catch (error) {
            reportAdminErrorMessage.textContent = 'An error occurred. Please try again.';
            reportAdminErrorMessage.className = 'error';
            reportAdminErrorMessage.classList.remove('hidden');
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            reportAdminLoginBtn.disabled = false;
        }
    });

    // Admin Dashboard Button Handlers
    document.getElementById('btn-admin-general-report').addEventListener('click', () => {
        hideAllReportSections();
        adminReportContent.classList.remove('hidden');
        
        // FOOLPROOF CLEAR: Always reset everything when entering this screen
        document.getElementById('admin-start-date').value = '';
        document.getElementById('admin-branch').value = 'All';
        document.getElementById('recon-cash-expense').value = '₱0.00';
        document.getElementById('recon-gcash-expense').value = '₱0.00';
        document.getElementById('recon-gcash-receivable').value = '₱0.00';
        document.getElementById('recon-cash-on-hand').value = '₱0.00';
        document.getElementById('recon-pondo-amount').value = '';
        document.getElementById('recon-total-income').value = '₱0.00';
        document.getElementById('recon-discrepancy').value = '₱0.00';
        document.getElementById('recon-discrepancy').style.color = '#ef4444';
        
        document.getElementById('recon-remarks').value = '';
        document.getElementById('recon-remarks-container').classList.add('hidden');
        
        if (typeof currentReconTotals !== 'undefined') {
            currentReconTotals.cashExpense = 0;
            currentReconTotals.gcashExpense = 0;
            currentReconTotals.gcashReceivable = 0;
            currentReconTotals.cashOnHand = 0;
        }
    });

    document.getElementById('btn-admin-statistics-report').addEventListener('click', () => {
        hideAllReportSections();
        adminStatisticsContent.classList.remove('hidden');
    });

    document.getElementById('btn-admin-audit-report').addEventListener('click', () => {
        hideAllReportSections();
        adminAuditContent.classList.remove('hidden');
        loadAuditLogs();
    });

    document.getElementById('btn-admin-salary-expenses').addEventListener('click', () => {
        hideAllReportSections();
        adminSalaryContent.classList.remove('hidden');
    });

    document.getElementById('btn-admin-survey-report').addEventListener('click', () => {
        hideAllReportSections();
        adminSurveyContent.classList.remove('hidden');
    });

    document.getElementById('btn-admin-attendance-report').addEventListener('click', () => {
        hideAllReportSections();
        adminAttendanceReportContent.classList.remove('hidden');
        
        // Auto-set current month range
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        document.getElementById('report-attendance-start-date').value = firstDay.toISOString().split('T')[0];
        document.getElementById('report-attendance-end-date').value = lastDay.toISOString().split('T')[0];
    });

    document.getElementById('btn-admin-monthly-income').addEventListener('click', () => {
        hideAllReportSections();
        adminMonthlyContent.classList.remove('hidden');

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        
        document.getElementById('monthly-start-date').valueAsDate = firstDay;
        document.getElementById('monthly-end-date').valueAsDate = now;
        document.getElementById('monthly-branch').value = 'All';
        
        document.getElementById('monthly-cash-expense').value = '₱0.00';
        document.getElementById('monthly-gcash-expense').value = '₱0.00';
        document.getElementById('monthly-gcash-receivable').value = '₱0.00';
        document.getElementById('monthly-cash-on-hand').value = '₱0.00';
        document.getElementById('monthly-salary-expense').value = '₱0.00';
        document.getElementById('monthly-total-income').value = '₱0.00';
        document.getElementById('monthly-pondo-amount').value = '₱0.00';
        document.getElementById('monthly-total-expenses').value = '₱0.00';
        document.getElementById('monthly-total-net-income').value = '₱0.00';
    });

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;

            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Set today's date as default for all forms
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('g-date').valueAsDate = new Date();
    document.getElementById('r-date').valueAsDate = new Date();
    document.getElementById('remit-date').valueAsDate = new Date();
    document.getElementById('acc-date').valueAsDate = new Date();

    const marvspcForm = document.getElementById('marvspc-expense-form');
    if (marvspcForm) {
        marvspcForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('marvspc-submit-btn');
            const statusMessage = document.getElementById('marvspc-status-message');
            
            if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
                showMessage(statusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
                return;
            }

            const formData = {
                action: 'addMarvsPcExpense',
                date: document.getElementById('marvspc-date').value,
                category: document.getElementById('marvspc-category').value,
                description: document.getElementById('marvspc-description').value,
                amount: document.getElementById('marvspc-amount').value,
                account: sessionStorage.getItem('loggedInUser'),
                encodedBy: sessionStorage.getItem('loggedInUser')
            };

            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.spinner');
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (result.status === 'success') {
                    showMessage(statusMessage, 'Expense saved successfully!', 'success');
                    marvspcForm.reset();
                    document.getElementById('marvspc-date').valueAsDate = new Date();
                } else {
                    showMessage(statusMessage, 'Error saving expense: ' + result.message, 'error');
                }
            } catch (err) {
                showMessage(statusMessage, 'Network error. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    cashForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate URL
        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(cashStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        // Get form data
        const cashDate = document.getElementById('date').value;
        const cashDesc = document.getElementById('description').value.trim();
        const cashAmountRaw = document.getElementById('amount').value;
        const cashAmount = parseFloat(cashAmountRaw);

        // --- Frontend Validation Guards ---
        if (!cashDate || !cashDesc || !cashAmountRaw) {
            showMessage(cashStatusMessage, 'Please fill in all required fields', 'error');
            return;
        }
        if (isNaN(cashAmount) || cashAmount <= 0) {
            showMessage(cashStatusMessage, 'Amount must be greater than 0', 'error');
            return;
        }
        const todayCash = new Date(); todayCash.setHours(0,0,0,0);
        const expDateCash = new Date(cashDate); expDateCash.setHours(0,0,0,0);
        if (expDateCash > todayCash) {
            showMessage(cashStatusMessage, 'Date cannot be in the future', 'error');
            return;
        }
        // --- End Frontend Validation ---

        const formData = {
            action: 'addCashExpense',
            branch: document.getElementById('branch').value,
            date: cashDate,
            description: cashDesc,
            amount: cashAmountRaw,
            receipt: document.getElementById('receipt').value,
            encodedBy: sessionStorage.getItem('loggedInUser')
        };

        // Loading state
        const btnText = cashSubmitBtn.querySelector('.btn-text');
        const spinner = cashSubmitBtn.querySelector('.spinner');
        cashSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        cashStatusMessage.classList.add('hidden');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(cashStatusMessage, 'Expense saved to Google Sheets successfully!', 'success');
                showToast('Cash expense saved!', 'success');
                cashForm.reset();
                document.getElementById('date').valueAsDate = new Date(); // reset date to today
            } else {
                showMessage(cashStatusMessage, result.message || ('Error: ' + result.message), 'error');
                showToast(result.message || 'Error saving expense.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(cashStatusMessage, 'Error submitting data. Make sure your Web App URL is correct.', 'error');
        } finally {
            // Reset loading state
            cashSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Handle Gcash Form Submission
    gcashForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(gcashStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        const referenceValue = document.getElementById('g-reference').value.trim();
        if (!referenceValue) {
            showMessage(gcashStatusMessage, 'Reference# is REQUIRED for GCash expenses.', 'error');
            return;
        }

        const gcashDate = document.getElementById('g-date').value;
        const gcashAmountRaw = document.getElementById('g-amount').value;
        const gcashAmount = parseFloat(gcashAmountRaw);
        const gcashPayment = document.getElementById('g-payment-method').value.trim();

        // --- Frontend Validation Guards ---
        if (!gcashDate || !gcashAmountRaw) {
            showMessage(gcashStatusMessage, 'Please fill in all required fields', 'error');
            return;
        }
        if (isNaN(gcashAmount) || gcashAmount <= 0) {
            showMessage(gcashStatusMessage, 'Amount must be greater than 0', 'error');
            return;
        }
        const todayGcash = new Date(); todayGcash.setHours(0,0,0,0);
        const expDateGcash = new Date(gcashDate); expDateGcash.setHours(0,0,0,0);
        if (expDateGcash > todayGcash) {
            showMessage(gcashStatusMessage, 'Date cannot be in the future', 'error');
            return;
        }
        // --- End Frontend Validation ---

        const formData = {
            action: 'addGcashExpense',
            branch: document.getElementById('g-branch').value,
            date: gcashDate,
            employee: document.getElementById('g-details').value, // Used to be employee, now details
            paymentMethod: gcashPayment,
            amount: gcashAmountRaw,
            reference: document.getElementById('g-reference').value,
            receipt: document.getElementById('g-receipt').value,
            encodedBy: sessionStorage.getItem('loggedInUser')
        };

        const btnText = gcashSubmitBtn.querySelector('.btn-text');
        const spinner = gcashSubmitBtn.querySelector('.spinner');
        gcashSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        gcashStatusMessage.classList.add('hidden');

        try {
            const urlEncodedData = new URLSearchParams(formData).toString();

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(gcashStatusMessage, 'Gcash Expense saved successfully!', 'success');
                showToast('GCash expense saved!', 'success');
                gcashForm.reset();
                document.getElementById('g-date').valueAsDate = new Date();
            } else {
                showMessage(gcashStatusMessage, result.message || ('Error: ' + result.message), 'error');
                showToast(result.message || 'Error saving GCash expense.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(gcashStatusMessage, 'Error submitting data.', 'error');
        } finally {
            gcashSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Handle Gcash Receivable Form Submission
    receivableForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(receivableStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        const referenceValue = document.getElementById('r-reference').value.trim();
        if (!referenceValue) {
            showMessage(receivableStatusMessage, 'Reference# is REQUIRED for GCash receivables.', 'error');
            return;
        }

        const formData = {
            action: 'addGcashReceivable',
            branch: document.getElementById('r-branch').value,
            date: document.getElementById('r-date').value,
            customerName: document.getElementById('r-customer-name').value,
            noOfHours: document.getElementById('r-no-of-hours').value,
            paymentMethod: document.getElementById('r-payment-method').value,
            reference: document.getElementById('r-reference').value,
            amount: document.getElementById('r-amount').value,
            employee: '', // Removed from UI
            encodedBy: sessionStorage.getItem('loggedInUser')
        };

        const btnText = receivableSubmitBtn.querySelector('.btn-text');
        const spinner = receivableSubmitBtn.querySelector('.spinner');
        receivableSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        receivableStatusMessage.classList.add('hidden');

        try {
            const urlEncodedData = new URLSearchParams(formData).toString();

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(receivableStatusMessage, 'Gcash Receivable saved successfully!', 'success');
                receivableForm.reset();
                document.getElementById('r-date').valueAsDate = new Date();
            } else {
                showMessage(receivableStatusMessage, 'Error saving to Sheets: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(receivableStatusMessage, 'Error submitting data.', 'error');
        } finally {
            receivableSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Helper function to convert file to Base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // The result contains the data URI (e.g., data:image/png;base64,iVBORw0K...)
                // We split it to get just the base64 string
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };

    // Handle Remitted Amount Form Submission (with Image)
    remitForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(remitStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        const fileInput = document.getElementById('remit-screenshot');
        if (!fileInput.files || fileInput.files.length === 0) {
            showMessage(remitStatusMessage, 'Please select an image file.', 'error');
            return;
        }

        const file = fileInput.files[0];

        // Ensure it's not too big (e.g. limit to 5MB to avoid payload issues)
        if (file.size > 5 * 1024 * 1024) {
            showMessage(remitStatusMessage, 'File is too large. Please upload an image smaller than 5MB.', 'error');
            return;
        }

        const btnText = remitSubmitBtn.querySelector('.btn-text');
        const spinner = remitSubmitBtn.querySelector('.spinner');
        remitSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        remitStatusMessage.classList.add('hidden');

        try {
            // Convert image to base64
            const base64Data = await fileToBase64(file);

            const formData = {
                action: 'addRemittedAmount',
                branch: document.getElementById('remit-branch').value,
                date: document.getElementById('remit-date').value,
                bankName: document.getElementById('remit-bank').value,
                amount: document.getElementById('remit-amount').value,
                fileName: file.name,
                mimeType: file.type,
                fileData: base64Data,
                encodedBy: sessionStorage.getItem('loggedInUser')
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(remitStatusMessage, 'Remittance and Image uploaded successfully!', 'success');
                remitForm.reset();
                document.getElementById('remit-date').valueAsDate = new Date();
            } else {
                showMessage(remitStatusMessage, 'Error saving to Sheets: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(remitStatusMessage, 'Error uploading data. Make sure file is not too large and network is stable.', 'error');
        } finally {
            remitSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    if (menuHandoverBtn) {
        menuHandoverBtn.addEventListener('click', async () => {
            const role = sessionStorage.getItem('userRole');
            hideAllContainers();
            handoverContainer.classList.remove('hidden');
            document.getElementById('handover-date').valueAsDate = new Date();
            
            const approverInput = document.getElementById('handover-approver');
            const statusSelect = document.getElementById('handover-status');
            
            // Force status to "In Progress" and disabled for new handovers
            if (statusSelect) {
                statusSelect.value = 'In Progress';
                statusSelect.disabled = true;
            }
            if (approverInput) {
                approverInput.value = sessionStorage.getItem('loggedInUser');
            }

            try {
                const outgoingSelect = document.getElementById('handover-outgoing-staff');
                const incomingSelect = document.getElementById('handover-incoming-staff');
                outgoingSelect.innerHTML = '<option value="" disabled selected>Loading technicians...</option>';
                incomingSelect.innerHTML = '<option value="" disabled selected>Loading technicians...</option>';

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'getTechnicians' })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    if (result.data && result.data.length > 0) {
                        const optionsHTML = '<option value="" disabled selected>Select Staff</option>' + 
                            result.data.map(tech => `<option value="${tech}">${tech}</option>`).join('');
                        outgoingSelect.innerHTML = optionsHTML;
                        incomingSelect.innerHTML = optionsHTML;
                    } else {
                        outgoingSelect.innerHTML = '<option value="" disabled selected>No technicians found</option>';
                        incomingSelect.innerHTML = '<option value="" disabled selected>No technicians found</option>';
                    }
                } else {
                    outgoingSelect.innerHTML = '<option value="" disabled selected>Failed to load technicians</option>';
                    incomingSelect.innerHTML = '<option value="" disabled selected>Failed to load technicians</option>';
                }
            } catch (error) {
                console.error("Error loading staff:", error);
                document.getElementById('handover-outgoing-staff').innerHTML = '<option value="" disabled selected>Error connecting</option>';
                document.getElementById('handover-incoming-staff').innerHTML = '<option value="" disabled selected>Error connecting</option>';
            }
        });
    }

    // ======= Attendance Logic =======
    const btnAttendance = document.getElementById('btn-attendance');
    const attendanceContainer = document.getElementById('attendance-container');
    const attendanceEmployeeInput = document.getElementById('attendance-employee');
    const attendanceBranchInput = document.getElementById('attendance-branch');
    const attendanceDateInput = document.getElementById('attendance-date');
    const attendanceTimeInDisplay = document.getElementById('attendance-time-in-display');
    const attendanceTimeOutDisplay = document.getElementById('attendance-time-out-display');
    const attendanceStatusMessage = document.getElementById('attendance-status-message');
    const attendanceTableBody = document.getElementById('attendance-table-body');
    const btnTimeIn = document.getElementById('btn-time-in');
    const btnTimeOut = document.getElementById('btn-time-out');
    const btnAttendanceRefresh = document.getElementById('btn-attendance-refresh');

    function todayDateStr() {
        const now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    }

    function renderAttendanceTable(rows) {
        if (!attendanceTableBody) return;
        if (!rows || rows.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="7" style="padding: 14px 10px; text-align: center; color: var(--text-muted);">No attendance records yet today.</td></tr>';
            return;
        }
        attendanceTableBody.innerHTML = rows.map(row => {
            const employee = row[2] || '';
            const branch = row[3] || '';
            const timeIn = row[4] || '--';
            const timeOut = row[5] || '--';
            const hours = row[6] || '--';
            const status = row[7] || '';
            const late = row[9] === undefined || row[9] === null || row[9] === '' ? '0' : row[9];
            const statusColor = status === 'Completed' ? '#34d399' : '#fbbf24';
            const lateColor = late !== '0' && late !== 0 ? '#ef4444' : 'var(--text-muted)';
            return `<tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 8px 7px;">${employee}</td>
                <td style="padding: 8px 7px;">${branch}</td>
                <td style="padding: 8px 7px;">${timeIn}</td>
                <td style="padding: 8px 7px;">${timeOut}</td>
                <td style="padding: 8px 7px;">${hours}</td>
                <td style="padding: 8px 7px; color: ${lateColor};">${late}</td>
                <td style="padding: 8px 7px; color: ${statusColor}; font-weight: 600;">${status}</td>
            </tr>`;
        }).join('');
    }

    // ===== View All Attendance Modal Logic =====
    let allAttendanceData = [];
    
    let attendanceRowToDelete = null;
    const attDeleteAuthModal = document.getElementById('attendance-delete-auth-modal');
    const closeAttDeleteAuthBtn = document.getElementById('close-att-delete-auth-btn');
    const attDeleteAuthForm = document.getElementById('attendance-delete-auth-form');
    const attDeleteUsernameInput = document.getElementById('att-delete-username');
    const attDeletePasswordInput = document.getElementById('att-delete-password');
    const attDeleteAuthBtn = document.getElementById('att-delete-auth-btn');

    window.deleteAttendanceRecord = function(rowIndex) {
        attendanceRowToDelete = rowIndex;
        if (attDeleteAuthModal) {
            if (attDeleteUsernameInput) attDeleteUsernameInput.value = '';
            if (attDeletePasswordInput) attDeletePasswordInput.value = '';
            attDeleteAuthModal.classList.remove('hidden');
        }
    };

    if (closeAttDeleteAuthBtn) {
        closeAttDeleteAuthBtn.addEventListener('click', () => {
            attDeleteAuthModal.classList.add('hidden');
            attendanceRowToDelete = null;
        });
    }

    window.handleAttendanceDeleteAuth = async function(e) {
        e.preventDefault();
        
        if (!attendanceRowToDelete) return;
        
        const username = attDeleteUsernameInput.value;
        const password = attDeletePasswordInput.value;
        
        const btnText = attDeleteAuthBtn.querySelector('.btn-text');
        const spinner = attDeleteAuthBtn.querySelector('.spinner');
        
        attDeleteAuthBtn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (spinner) spinner.classList.remove('hidden');
        
        try {
            // Verify identity first
            const verifyRes = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'login',
                    username: username,
                    password: password
                })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.status === 'success') {
                const role = verifyData.role; 
                if (role === 'Owner' || role === 'Manager') {
                    // User is authorized, proceed to delete
                    showToast('Verification success. Deleting record...', 'info');
                    const deleteRes = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'deleteAttendance',
                            rowIndex: attendanceRowToDelete,
                            encodedBy: verifyData.name || username
                        })
                    });
                    const deleteData = await deleteRes.json();
                    
                    if (deleteData.status === 'success') {
                        showToast('Record deleted successfully', 'success');
                        attDeleteAuthModal.classList.add('hidden');
                        loadAllAttendance(); 
                        loadAttendanceToday(); 
                    } else {
                        showToast(deleteData.message || 'Error deleting record', 'error');
                    }
                } else {
                    showToast('Access denied. Manager or Owner role required.', 'error');
                }
            } else {
                showToast('Invalid username or password', 'error');
            }
        } catch (error) {
            console.error('Delete auth error:', error);
            showToast('Network error', 'error');
        } finally {
            attDeleteAuthBtn.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (spinner) spinner.classList.add('hidden');
        }
    };

    function renderAttendanceTableList(rows) {
        const tbody = document.getElementById('attendanceTableBodyList');
        if (!tbody) return;
        
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">No attendance records found.</td></tr>';
            return;
        }
        
        const sortedRows = [...rows].sort((a, b) => new Date(b[1]) - new Date(a[1]));
        
        tbody.innerHTML = sortedRows.map(row => {
            const date = row[1] || '';
            const employee = row[2] || '';
            const branch = row[3] || '';
            const timeIn = row[4] || '--';
            const timeOut = row[5] || '--';
            const hours = row[6] || '--';
            const status = row[7] || '';
            const otHours = row[8] || '0';
            const late = row[9] === undefined || row[9] === null || row[9] === '' ? '0' : row[9];
            const rowIndex = row[10];
            
            const statusColor = status === 'Completed' ? '#34d399' : '#fbbf24';
            const lateColor = late !== '0' && late !== 0 ? '#ef4444' : 'var(--text-muted)';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td style="font-weight: 500;">${employee}</td>
                    <td style="color: var(--text-muted);">${branch}</td>
                    <td>${timeIn}</td>
                    <td>${timeOut}</td>
                    <td style="font-weight: 600;">${hours}</td>
                    <td style="color: ${lateColor};">${late}</td>
                    <td style="font-weight: 600;">${otHours}</td>
                    <td><span style="background: rgba(255,255,255,0.1); color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 500;">${status}</span></td>
                    <td>
                        <button class="delete-btn" onclick="deleteAttendanceRecord(${rowIndex})" style="background: rgba(239,68,68,0.15); border: none; color: #ef4444; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.3)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'" title="Delete Record">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function filterAttendanceByDate() {
        const fromVal = document.getElementById('attendanceFilterFrom').value;
        const toVal = document.getElementById('attendanceFilterTo').value;
        
        let filtered = allAttendanceData;
        if (fromVal || toVal) {
            const fromDate = fromVal ? new Date(fromVal).setHours(0,0,0,0) : null;
            const toDate = toVal ? new Date(toVal).setHours(23,59,59,999) : null;
            
            filtered = allAttendanceData.filter(row => {
                if (!row[1]) return false;
                const rowDate = new Date(row[1]).getTime();
                if (fromDate && rowDate < fromDate) return false;
                if (toDate && rowDate > toDate) return false;
                return true;
            });
        }
        
        renderAttendanceTableList(filtered);
    }

    async function loadAllAttendance() {
        const grid = document.getElementById('attendance-flex-grid');
        if (grid) grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>';
        
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'getAllAttendance' })
            });
            const result = await response.json();
            if (result.status === 'success') {
                allAttendanceData = result.data;
                filterAttendanceByDate();
            } else {
                showToast('Failed to load records', 'error');
                if (grid) grid.innerHTML = '<div style="color: var(--error); padding: 20px;">Failed to load records.</div>';
            }
        } catch (error) {
            console.error('Error loading all attendance:', error);
            if (grid) grid.innerHTML = '<div style="color: var(--error); padding: 20px;">Error connecting to server.</div>';
        }
    }

    async function loadAttendanceToday() {
        if (!attendanceTableBody) return;
        attendanceTableBody.innerHTML = '<tr><td colspan="6" style="padding: 14px 10px; text-align: center; color: var(--text-muted);">Loading...</td></tr>';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'getAttendanceToday' })
            });
            const result = await response.json();
            if (result.status === 'success') {
                renderAttendanceTable(result.data);
            } else {
                attendanceTableBody.innerHTML = '<tr><td colspan="6" style="padding: 14px 10px; text-align: center; color: var(--error);">Failed to load attendance.</td></tr>';
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            attendanceTableBody.innerHTML = '<tr><td colspan="6" style="padding: 14px 10px; text-align: center; color: var(--error);">Error connecting.</td></tr>';
        }
    }

    if (btnAttendance) {
        btnAttendance.addEventListener('click', () => {
            hideAllContainers();
            attendanceContainer.classList.remove('hidden');
            if (attendanceEmployeeInput) attendanceEmployeeInput.value = sessionStorage.getItem('loggedInUser') || '';
            if (attendanceDateInput) attendanceDateInput.value = todayDateStr();
            if (attendanceBranchInput) attendanceBranchInput.value = sessionStorage.getItem('userStore') || '';
            if (attendanceTimeInDisplay) attendanceTimeInDisplay.value = '';
            if (attendanceTimeOutDisplay) attendanceTimeOutDisplay.value = '';
            loadAttendanceToday();
        });
    }

    if (btnAttendanceRefresh) {
        btnAttendanceRefresh.addEventListener('click', loadAttendanceToday);
    }

    // Modal Event Listeners
    const btnViewAllAttendance = document.getElementById('btn-view-all-attendance');
    const viewAllAttendanceModal = document.getElementById('viewAllAttendanceModal');
    const closeAttendanceModalBtn = document.getElementById('close-attendance-modal-btn');
    const applyAttendanceFilterBtn = document.getElementById('applyAttendanceFilterBtn');
    const clearAttendanceFilterBtn = document.getElementById('clearAttendanceFilterBtn');
    const attendanceFilterFrom = document.getElementById('attendanceFilterFrom');
    const attendanceFilterTo = document.getElementById('attendanceFilterTo');

    if (btnViewAllAttendance) {
        btnViewAllAttendance.addEventListener('click', () => {
            if (viewAllAttendanceModal) viewAllAttendanceModal.classList.remove('hidden');
            loadAllAttendance();
        });
    }
    
    if (closeAttendanceModalBtn) {
        closeAttendanceModalBtn.addEventListener('click', () => {
            if (viewAllAttendanceModal) viewAllAttendanceModal.classList.add('hidden');
        });
    }

    if (applyAttendanceFilterBtn) {
        applyAttendanceFilterBtn.addEventListener('click', filterAttendanceByDate);
    }
    
    if (clearAttendanceFilterBtn) {
        clearAttendanceFilterBtn.addEventListener('click', () => {
            if (attendanceFilterFrom) attendanceFilterFrom.value = '';
            if (attendanceFilterTo) attendanceFilterTo.value = '';
            filterAttendanceByDate();
        });
    }

    async function submitAttendance(action, btn) {
        if (!attendanceEmployeeInput || !attendanceEmployeeInput.value) {
            showMessage(attendanceStatusMessage, 'Employee not found. Please log in again.', 'error');
            return;
        }
        if (!attendanceBranchInput || !attendanceBranchInput.value) {
            showMessage(attendanceStatusMessage, 'Please select your branch.', 'error');
            return;
        }
        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        btn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (spinner) spinner.classList.remove('hidden');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: action,
                    employee: attendanceEmployeeInput.value,
                    branch: attendanceBranchInput ? attendanceBranchInput.value : '',
                    date: attendanceDateInput ? attendanceDateInput.value : todayDateStr(),
                    encodedBy: sessionStorage.getItem('loggedInUser') || 'Unknown'
                })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showMessage(attendanceStatusMessage, result.message, 'success');
                if (action === 'timeIn' && attendanceTimeInDisplay) attendanceTimeInDisplay.value = result.timeIn || '';
                if (action === 'timeOut' && attendanceTimeOutDisplay) attendanceTimeOutDisplay.value = result.timeOut || '';
                loadAttendanceToday();
            } else {
                showMessage(attendanceStatusMessage, result.message || 'Something went wrong.', 'error');
            }
        } catch (error) {
            console.error('Attendance error:', error);
            showMessage(attendanceStatusMessage, 'Error connecting to server.', 'error');
        } finally {
            btn.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (spinner) spinner.classList.add('hidden');
        }
    }

    if (btnTimeIn) {
        btnTimeIn.addEventListener('click', () => submitAttendance('timeIn', btnTimeIn));
    }
    if (btnTimeOut) {
        btnTimeOut.addEventListener('click', () => submitAttendance('timeOut', btnTimeOut));
    }

    // Role-based logic and form submissions
    const cohForm = document.getElementById('cash-on-hand-form');
    const cohSubmitBtn = document.getElementById('coh-submit-btn');
    const cohStatusMessage = document.getElementById('coh-status-message');

    cohForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(cohStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        const formData = {
            action: 'addCashOnHand',
            branch: document.getElementById('coh-branch').value,
            date: document.getElementById('coh-date').value,
            amount: document.getElementById('coh-amount').value,
            encodedBy: sessionStorage.getItem('loggedInUser')
        };

        const btnText = cohSubmitBtn.querySelector('.btn-text');
        const spinner = cohSubmitBtn.querySelector('.spinner');
        cohSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        cohStatusMessage.classList.add('hidden');

        try {
            const urlEncodedData = new URLSearchParams(formData).toString();

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(cohStatusMessage, 'Daily Cash on Hand saved successfully!', 'success');
                cohForm.reset();
                document.getElementById('coh-date').valueAsDate = new Date();
            } else {
                showMessage(cohStatusMessage, 'Error saving to Sheets: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(cohStatusMessage, 'Error submitting data. Make sure network is stable.', 'error');
        } finally {
            cohSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Handle Salary Expense Form Submission
    const salaryForm = document.getElementById('salary-expense-form');
    if (salaryForm) {
        const salarySubmitBtn = document.getElementById('salary-submit-btn');
        const salaryStatusMessage = document.getElementById('salary-status-message');

        salaryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
                showMessage(salaryStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
                return;
            }

            const formData = {
                action: 'addSalaryExpense',
                startDate: document.getElementById('salary-start-date').value,
                endDate: document.getElementById('salary-end-date').value,
                branch: document.getElementById('salary-branch').value,
                internetCost: document.getElementById('expense-internet').value || 0,
                rentCost: document.getElementById('expense-rent').value || 0,
                electricityCost: document.getElementById('expense-electricity').value || 0,
                waterCost: document.getElementById('expense-water').value || 0,
                pondoCost: document.getElementById('expense-pondo').value || 0,
                foodCost: document.getElementById('expense-food').value || 0,
                salaryCost: document.getElementById('expense-salary').value || 0,
                encodedBy: sessionStorage.getItem('loggedInUser')
            };

            const btnText = salarySubmitBtn.querySelector('.btn-text');
            const spinner = salarySubmitBtn.querySelector('.spinner');
            salarySubmitBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            salaryStatusMessage.classList.add('hidden');

            try {
                const urlEncodedData = new URLSearchParams(formData).toString();

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: urlEncodedData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showMessage(salaryStatusMessage, 'Salary Expense saved successfully!', 'success');
                    salaryForm.reset();
                } else {
                    showMessage(salaryStatusMessage, 'Error saving to Sheets: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage(salaryStatusMessage, 'Error submitting data. Make sure network is stable.', 'error');
            } finally {
                salarySubmitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    // Auto-generate Account Name based on Name
    const accNameInput = document.getElementById('acc-name');
    const accAccountNameInput = document.getElementById('acc-account-name');

    accNameInput.addEventListener('input', (e) => {
        const fullName = e.target.value.trim().replace(/\s+/g, ' ').toLowerCase();
        if (!fullName) {
            accAccountNameInput.value = '';
            return;
        }
        
        const parts = fullName.split(' ');
        if (parts.length === 1) {
            accAccountNameInput.value = parts[0];
        } else {
            const firstInitial = parts[0].charAt(0);
            const lastNames = parts.slice(1).join('');
            accAccountNameInput.value = firstInitial + lastNames;
        }
    });

    // Handle Create Account Form Submission
    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(accountStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        const formData = {
            action: 'createAccount',
            date: document.getElementById('acc-date').value,
            name: document.getElementById('acc-name').value,
            accountName: document.getElementById('acc-account-name').value,
            password: document.getElementById('acc-password').value,
            role: document.getElementById('acc-role').value,
            store: document.getElementById('acc-store').value
        };

        const btnText = accountSubmitBtn.querySelector('.btn-text');
        const spinner = accountSubmitBtn.querySelector('.spinner');
        accountSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        accountStatusMessage.classList.add('hidden');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(accountStatusMessage, 'Account created successfully!', 'success');
                accountForm.reset();
                document.getElementById('acc-date').valueAsDate = new Date();
            } else {
                showMessage(accountStatusMessage, 'Error creating account: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(accountStatusMessage, 'Error submitting data. Make sure network is stable.', 'error');
        } finally {
            accountSubmitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    function showMessage(element, msg, type) {
        element.textContent = msg;
        // Keep any inline styles but apply status-msg and the type (success/error)
        element.className = `status-msg ${type}`;
        element.classList.remove('hidden');

        // Hide after 5 seconds
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }

    // PDF Report Generator Logic
    let chartInstances = {};

    function aggregateChartData(data, reportType) {
        const grouped = { monthly: {}, category: {}, payment: {}, store: {} };
        let dateIdx = 1, amountIdx = 3, categoryIdx = 2, paymentIdx = -1, branchIdx = 0;
        
        if (reportType === 'Cash Expense') { dateIdx = 1; amountIdx = 3; categoryIdx = 2; }
        if (reportType === 'Gcash Expense') { dateIdx = 1; amountIdx = 4; categoryIdx = 2; paymentIdx = 3; } 
        if (reportType === 'Gcash Receivable') { dateIdx = 1; amountIdx = 6; categoryIdx = 2; paymentIdx = 4; }
        if (reportType === 'Remitted Amount') { dateIdx = 0; amountIdx = 2; categoryIdx = -1; }
        if (reportType === 'Cash on Hand') { dateIdx = 1; amountIdx = 2; categoryIdx = -1; }

        data.forEach(row => {
            let dateVal = row[dateIdx] || '';
            let amountStr = (row[amountIdx] || 0).toString().replace(/[^0-9.-]+/g, '');
            let amount = parseFloat(amountStr) || 0;
            let branch = row[branchIdx] || 'Unknown';
            
            let month = 'Unknown';
            if (dateVal) {
                try {
                    let d = new Date(dateVal);
                    if (!isNaN(d)) month = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                } catch(e) {}
            }
            grouped.monthly[month] = (grouped.monthly[month] || 0) + amount;
            grouped.store[branch] = (grouped.store[branch] || 0) + amount;

            if (categoryIdx > -1) {
                let cat = row[categoryIdx] || 'Uncategorized';
                grouped.category[cat] = (grouped.category[cat] || 0) + amount;
            }

            if (paymentIdx > -1) {
                let pay = row[paymentIdx] || 'Unknown';
                grouped.payment[pay] = (grouped.payment[pay] || 0) + amount;
            } else if (reportType.includes('Cash')) {
                grouped.payment['Cash'] = (grouped.payment['Cash'] || 0) + amount;
            }
        });
        return grouped;
    }

    function renderDashboardCharts(data, reportType) {
        const chartsGrid = document.getElementById('dashboard-charts-grid');
        if(chartsGrid) chartsGrid.classList.remove('hidden');
        const aggData = aggregateChartData(data, reportType);
        ['monthlyExpensesChart','categoryExpensesChart','paymentMethodChart','storeComparisonChart'].forEach(id=>{ if(chartInstances[id]) chartInstances[id].destroy(); });

        const gridColor = 'rgba(255,255,255,0.06)';
        const tickColor = '#94a3b8';
        const labelColor = '#e2e8f0';

        const baseOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: labelColor, padding: 12, boxWidth: 12, font: { size: 11 } } },
                title: { display: true, color: labelColor, font: { size: 13, weight: '600' } }
            }
        };

        const ctxM = document.getElementById('monthlyExpensesChart');
        if(ctxM) chartInstances['monthlyExpensesChart'] = new Chart(ctxM, {
            type: 'bar',
            data: { labels: Object.keys(aggData.monthly), datasets: [{ label: 'Amount', data: Object.values(aggData.monthly), backgroundColor: 'rgba(59,130,246,0.6)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 6 }] },
            options: {...baseOpts, plugins: {...baseOpts.plugins, title: {...baseOpts.plugins.title, text: 'Monthly Expenses' } }, scales: { x: { ticks: { color: tickColor }, grid: { color: gridColor } }, y: { ticks: { color: tickColor }, grid: { color: gridColor } } } }
        });

        const ctxC = document.getElementById('categoryExpensesChart');
        if(ctxC) chartInstances['categoryExpensesChart'] = new Chart(ctxC, {
            type: 'doughnut',
            data: { labels: Object.keys(aggData.category).slice(0,8), datasets: [{ data: Object.values(aggData.category).slice(0,8), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#6366f1'], borderWidth: 0 }] },
            options: {...baseOpts, cutout: '65%', plugins: {...baseOpts.plugins, title: {...baseOpts.plugins.title, text: 'By Category (Top 8)' } } }
        });

        const ctxP = document.getElementById('paymentMethodChart');
        if(ctxP) chartInstances['paymentMethodChart'] = new Chart(ctxP, {
            type: 'pie',
            data: { labels: Object.keys(aggData.payment), datasets: [{ data: Object.values(aggData.payment), backgroundColor: ['#10b981','#3b82f6','#f59e0b'], borderWidth: 0 }] },
            options: {...baseOpts, plugins: {...baseOpts.plugins, title: {...baseOpts.plugins.title, text: 'By Payment Method' } } }
        });

        const ctxS = document.getElementById('storeComparisonChart');
        const storeCard = document.getElementById('storeComparisonCard');
        const role = sessionStorage.getItem('userRole');
        if(ctxS && storeCard) {
            if(role==='Owner'||role==='Manager'||role==='RMA Admin') {
                storeCard.style.display='block';
                chartInstances['storeComparisonChart'] = new Chart(ctxS, {
                    type: 'bar',
                    data: { labels: Object.keys(aggData.store), datasets: [{ label: 'Total', data: Object.values(aggData.store), backgroundColor: 'rgba(139,92,246,0.6)', borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 6 }] },
                    options: {...baseOpts, plugins: {...baseOpts.plugins, title: {...baseOpts.plugins.title, text: 'By Store/Branch' } }, scales: { x: { ticks: { color: tickColor }, grid: { display: false } }, y: { ticks: { color: tickColor }, grid: { color: gridColor } } } }
                });
            } else storeCard.style.display='none';
        }
    }

    async function generateReport(role, prefix) {
        const startDate = document.getElementById(`${prefix}-start-date`).value;
        const endDate = document.getElementById(`${prefix}-end-date`).value;
        const branch = document.getElementById(`${prefix}-branch`).value;
        const reportType = document.getElementById(`${prefix}-report-type`).value;
        const resultsContainer = document.getElementById(`${prefix}-report-results`);
        const btn = document.getElementById(`btn-generate-${prefix}-report`);
        
        if (!startDate || !endDate) {
            resultsContainer.innerHTML = '<p class="error">Please select both Start Date and End Date.</p>';
            return;
        }

        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        btn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        resultsContainer.innerHTML = '<p>Fetching data from Google Sheets... Please wait.</p>';

        try {
            const formData = {
                action: 'getReportData',
                reportType: reportType,
                startDate: startDate,
                endDate: endDate,
                branch: branch
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                const htmlString = buildReportHTML(result.data, reportType, startDate, endDate, branch, prefix);
                
                if (htmlString.includes('No records found')) {
                    resultsContainer.innerHTML = htmlString;
                    const chartsGrid = document.getElementById('dashboard-charts-grid');
                    if(chartsGrid) chartsGrid.classList.add('hidden');
                    return;
                }
                
                if (typeof renderDashboardCharts === 'function') {
                    renderDashboardCharts(result.data, reportType);
                }

                resultsContainer.innerHTML = '<p>Generating PDF... Please check the new tab that will open.</p>';
                
                // Open new tab synchronously to avoid popup blocker
                const newTab = window.open('', '_blank');
                if (newTab) {
                    newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating PDF Report, please wait...</h3>');
                } else {
                    resultsContainer.innerHTML = '<p class="error">Popup blocked! Please allow popups for this site to view the PDF.</p>';
                }

                // Create off-screen container for html2pdf to process
                const hiddenDiv = document.createElement('div');
                hiddenDiv.innerHTML = htmlString;
                hiddenDiv.style.position = 'absolute';
                hiddenDiv.style.top = '-9999px';
                hiddenDiv.style.left = '-9999px';
                hiddenDiv.style.width = '800px'; // simulate A4 width
                document.body.appendChild(hiddenDiv);
                
                const element = hiddenDiv.querySelector(`#${prefix}-pdf-content-wrapper`);

                if (!element) {
                     resultsContainer.innerHTML = '<p class="error">Error formatting PDF view.</p>';
                     if (newTab) newTab.close();
                     document.body.removeChild(hiddenDiv);
                     return;
                }

                const opt = {
                    margin:       0.5,
                    filename:     `${reportType.replace(/ /g, '_')}_Report_${startDate}_to_${endDate}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
                    pagebreak:    { mode: 'css', avoid: 'tr' }
                };

                html2pdf().set(opt).from(element).output('bloburl').then(function(pdfUrl) {
                    if (newTab) {
                        newTab.location.href = pdfUrl;
                    }
                    resultsContainer.innerHTML = '<p style="color: var(--primary);">Report opened in a new tab successfully!</p>';
                    document.body.removeChild(hiddenDiv);
                }).catch(err => {
                    console.error(err);
                    resultsContainer.innerHTML = '<p class="error">Error generating PDF view.</p>';
                    if (newTab) newTab.close();
                    document.body.removeChild(hiddenDiv);
                });
            } else {
                resultsContainer.innerHTML = `<p class="error">Error: ${result.message}</p>`;
            }
        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = '<p class="error">Error fetching report data. Check network.</p>';
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    document.getElementById('btn-generate-staff-report').addEventListener('click', () => {
        generateReport('Staff', 'staff');
    });

    // Store current totals for calculation
    let currentReconTotals = {
        cashExpense: 0,
        gcashExpense: 0,
        gcashReceivable: 0,
        cashOnHand: 0
    };
    
    function calculateDiscrepancy() {
        const pondoInput = document.getElementById('recon-pondo-amount');
        const incomeInput = document.getElementById('recon-total-income');
        const discInput = document.getElementById('recon-discrepancy');
        
        const pondo = parseFloat(pondoInput.value) || 0;
        
        // Total Income = Cash on hand + Gcash Receivable + Cash Expense
        const income = currentReconTotals.cashOnHand + currentReconTotals.gcashReceivable + currentReconTotals.cashExpense;
        
        // Discrepancy = Pondo Amount - Total Income
        const discrepancy = pondo - income;
        
        incomeInput.value = `₱${formatCurrency(income)}`;
        
        const remarksContainer = document.getElementById('recon-remarks-container');
        
        if (pondo === income) {
            discInput.value = "Balance";
            discInput.style.color = '#10b981'; // Green
            remarksContainer.classList.add('hidden'); // Hide remarks if balanced
        } else {
            discInput.value = `₱${formatCurrency(discrepancy)}`;
            remarksContainer.classList.remove('hidden'); // Show remarks if there's a discrepancy
            if (discrepancy < 0) {
                discInput.style.color = '#ef4444'; // Red (Short)
            } else {
                discInput.style.color = '#10b981'; // Green (Over)
            }
        }
    }
    
    document.getElementById('recon-pondo-amount').addEventListener('input', calculateDiscrepancy);
    
    // Strictly numbers only for Pondo Amount
    document.getElementById('recon-pondo-amount').addEventListener('keydown', function(e) {
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    });

    document.getElementById('btn-generate-admin-report').addEventListener('click', async () => {
        const startDate = document.getElementById('admin-start-date').value;
        const endDate = startDate; // Use the same date to filter exactly one day
        const branch = document.getElementById('admin-branch').value;
        const btn = document.getElementById('btn-generate-admin-report');
        const pondoVal = document.getElementById('recon-pondo-amount').value;
        
        if (!startDate) {
            alert("Please select a Date.");
            return;
        }

        if (!pondoVal) {
            alert("Please enter the Pondo Amount before reconciling.");
            return;
        }

        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        btn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const formData = {
                action: 'getReconciliationData',
                startDate: startDate,
                endDate: endDate,
                branch: branch
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                const totals = result.data;
                document.getElementById('recon-cash-expense').value = `₱${formatCurrency(totals.cashExpense)}`;
                document.getElementById('recon-gcash-expense').value = `₱${formatCurrency(totals.gcashExpense)}`;
                document.getElementById('recon-gcash-receivable').value = `₱${formatCurrency(totals.gcashReceivable)}`;
                document.getElementById('recon-cash-on-hand').value = `₱${formatCurrency(totals.cashOnHand)}`;
                
                currentReconTotals.cashExpense = totals.cashExpense;
                currentReconTotals.gcashExpense = totals.gcashExpense;
                currentReconTotals.gcashReceivable = totals.gcashReceivable;
                currentReconTotals.cashOnHand = totals.cashOnHand;
                
                calculateDiscrepancy();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert("Fetch Error: " + error.message + "\nPlease check Developer Console (F12) for more details.");
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    const btnGenerateMonthlyReport = document.getElementById('btn-generate-monthly-report');
    if (btnGenerateMonthlyReport) {
        btnGenerateMonthlyReport.addEventListener('click', async () => {
            const startDate = document.getElementById('monthly-start-date').value;
            const endDate = document.getElementById('monthly-end-date').value;
            const branch = document.getElementById('monthly-branch').value;

            if (!startDate || !endDate) {
                alert("Please select both Start Date and End Date.");
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                alert("Start Date cannot be later than End Date.");
                return;
            }

            const btnText = btnGenerateMonthlyReport.querySelector('.btn-text');
            const spinner = btnGenerateMonthlyReport.querySelector('.spinner');
            btnGenerateMonthlyReport.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            try {
                const formData = {
                    action: 'getMonthlyIncome',
                    startDate: startDate,
                    endDate: endDate,
                    branch: branch
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    const totals = result.data;
                    document.getElementById('monthly-cash-expense').value = `₱${formatCurrency(totals.cashExpense)}`;
                    document.getElementById('monthly-gcash-expense').value = `₱${formatCurrency(totals.gcashExpenses)}`;
                    document.getElementById('monthly-gcash-receivable').value = `₱${formatCurrency(totals.gcashReceivable)}`;
                    document.getElementById('monthly-cash-on-hand').value = `₱${formatCurrency(totals.cashOnHand)}`;
                    document.getElementById('monthly-salary-expense').value = `₱${formatCurrency(totals.salaryExpenses)}`;
                    
                    const computedMonthlySales = totals.cashOnHand + totals.gcashReceivable + totals.cashExpense;
                    document.getElementById('monthly-total-income').value = `₱${formatCurrency(computedMonthlySales)}`;
                    
                    document.getElementById('monthly-pondo-amount').value = `₱${formatCurrency(totals.pondoAmount)}`;

                    // Monthly Expenses = Total computation ng Other Expenses tab
                    const monthlyExpenses = totals.salaryExpenses;
                    document.getElementById('monthly-total-expenses').value = `₱${formatCurrency(monthlyExpenses)}`;

                    // Total Net Income = (Gcash Receivable + Cash on Hand) - Monthly Expenses
                    const totalNetIncome = (totals.gcashReceivable + totals.cashOnHand) - monthlyExpenses;
                    document.getElementById('monthly-total-net-income').value = `₱${formatCurrency(totalNetIncome)}`;
                } else {
                    alert("Error: " + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert("Fetch Error: " + error.message);
            } finally {
                btnGenerateMonthlyReport.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    const btnSaveMonthlyCheck = document.getElementById('btn-save-monthly-check');
    if (btnSaveMonthlyCheck) {
        btnSaveMonthlyCheck.addEventListener('click', async () => {
            const startDate = document.getElementById('monthly-start-date').value;
            const endDate = document.getElementById('monthly-end-date').value;
            const branch = document.getElementById('monthly-branch').value;
            
            if (!startDate || !endDate) {
                alert("Please select both Start Date and End Date.");
                return;
            }

            const parseCurrency = (val) => parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;

            const cashExpense = parseCurrency(document.getElementById('monthly-cash-expense').value);
            const gcashExpense = parseCurrency(document.getElementById('monthly-gcash-expense').value);
            const gcashReceivable = parseCurrency(document.getElementById('monthly-gcash-receivable').value);
            const cashOnHand = parseCurrency(document.getElementById('monthly-cash-on-hand').value);
            const salaryExpenses = parseCurrency(document.getElementById('monthly-salary-expense').value);
            const monthlySales = parseCurrency(document.getElementById('monthly-total-income').value);
            const pondoAmount = parseCurrency(document.getElementById('monthly-pondo-amount').value);
            const monthlyExpenses = parseCurrency(document.getElementById('monthly-total-expenses').value);
            const totalNetIncome = parseCurrency(document.getElementById('monthly-total-net-income').value);

            const btnText = btnSaveMonthlyCheck.querySelector('.btn-text');
            const spinner = btnSaveMonthlyCheck.querySelector('.spinner');
            const statusMsg = document.getElementById('monthly-income-status-message');
            
            btnSaveMonthlyCheck.disabled = true;
            if(btnText) btnText.classList.add('hidden');
            if(spinner) spinner.classList.remove('hidden');
            if(statusMsg) statusMsg.classList.add('hidden');

            try {
                const formData = {
                    action: 'saveMonthlyIncome',
                    startDate: startDate,
                    endDate: endDate,
                    branch: branch,
                    cashExpense: cashExpense,
                    gcashExpense: gcashExpense,
                    gcashReceivable: gcashReceivable,
                    cashOnHand: cashOnHand,
                    salaryExpenses: salaryExpenses,
                    monthlySales: monthlySales,
                    pondoAmount: pondoAmount,
                    monthlyExpenses: monthlyExpenses,
                    totalNetIncome: totalNetIncome,
                    encodedBy: sessionStorage.getItem('loggedInUser')
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    if(statusMsg) {
                        statusMsg.textContent = result.message;
                        statusMsg.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
                        statusMsg.style.color = '#10b981';
                        statusMsg.style.border = '1px solid rgba(16, 185, 129, 0.4)';
                        statusMsg.classList.remove('hidden');
                    }
                } else {
                    if(statusMsg) {
                        statusMsg.textContent = "Error: " + result.message;
                        statusMsg.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        statusMsg.style.color = '#ef4444';
                        statusMsg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                        statusMsg.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                if(statusMsg) {
                    statusMsg.textContent = "Error saving data. Check console.";
                    statusMsg.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    statusMsg.style.color = '#ef4444';
                    statusMsg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                    statusMsg.classList.remove('hidden');
                }
            } finally {
                btnSaveMonthlyCheck.disabled = false;
                if(btnText) btnText.classList.remove('hidden');
                if(spinner) spinner.classList.add('hidden');
                
                if(statusMsg) {
                    setTimeout(() => {
                        statusMsg.classList.add('hidden');
                    }, 5000);
                }
            }
        });
    }

    const btnPrintMonthlyReport = document.getElementById('btn-print-monthly-report');
    if (btnPrintMonthlyReport) {
        btnPrintMonthlyReport.addEventListener('click', async () => {
            const startDate = document.getElementById('monthly-start-date').value;
            const endDate = document.getElementById('monthly-end-date').value;
            const branch = document.getElementById('monthly-branch').value;
            
            if (!startDate || !endDate) {
                alert("Please select both Start Date and End Date first.");
                return;
            }

            const btnText = btnPrintMonthlyReport.querySelector('.btn-text');
            const spinner = btnPrintMonthlyReport.querySelector('.spinner');
            btnPrintMonthlyReport.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (spinner) spinner.classList.remove('hidden');

            const newTab = window.open('', '_blank');
            if (newTab) {
                newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating PDF Report, please wait...</h3>');
            } else {
                alert('Popup blocked! Please allow popups for this site to view the PDF.');
            }

            try {
                const formatCurrencyToPdf = (val) => {
                    let num = parseFloat(val);
                    if (isNaN(num)) return '₱0.00';
                    return '₱' + num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                };

                // Fetch Monthly Totals
                const totalsResponse = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'getMonthlyIncome',
                        startDate: startDate,
                        endDate: endDate,
                        branch: branch
                    })
                });
                const totalsResult = await totalsResponse.json();
                
                if (totalsResult.status !== 'success') {
                    throw new Error("Failed to fetch totals: " + totalsResult.message);
                }
                
                const totals = totalsResult.data;
                const computedMonthlySales = totals.cashOnHand + totals.gcashReceivable + totals.cashExpense;
                const monthlyExpenses = totals.salaryExpenses;
                const netIncome = (totals.gcashReceivable + totals.cashOnHand) - monthlyExpenses;

                const cashExpenseStr = formatCurrencyToPdf(totals.cashExpense);
                const gcashExpenseStr = formatCurrencyToPdf(totals.gcashExpenses);
                const gcashReceivableStr = formatCurrencyToPdf(totals.gcashReceivable);
                const cashOnHandStr = formatCurrencyToPdf(totals.cashOnHand);
                const salaryExpensesStr = formatCurrencyToPdf(totals.salaryExpenses);
                
                const monthlySalesStr = formatCurrencyToPdf(computedMonthlySales);
                const pondoAmountStr = formatCurrencyToPdf(totals.pondoAmount);
                const monthlyExpensesStr = formatCurrencyToPdf(monthlyExpenses);
                const netIncomeStr = formatCurrencyToPdf(netIncome);

                // Fetch Daily Records
                const recordsResponse = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'getDailyRecordsByRange',
                        startDate: startDate,
                        endDate: endDate,
                        branch: branch
                    })
                });
                const recordsResult = await recordsResponse.json();
                
                if (recordsResult.status !== 'success') {
                    throw new Error("Failed to fetch records: " + recordsResult.message);
                }

                const rows = recordsResult.data;
                let rowsHtml = '';
                
                if (!rows || rows.length === 0) {
                    rowsHtml = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: #9ca3af; font-family: Arial, Helvetica, sans-serif;">No saved Daily Records found for the selected date range and branch.</td></tr>';
                } else {
                    rows.forEach(row => {
                        const [rowDate, rowBranch, cashExp, gcashExp, gcashRec, coh, dSales, pAmt, disc] = row;
                        
                        let formattedDate = rowDate;
                        if (rowDate && String(rowDate).includes('T')) {
                            formattedDate = String(rowDate).split('T')[0];
                        }

                        const fmt = formatCurrencyToPdf;
                        rowsHtml += `
                            <tr>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: left; color: #333;">${formattedDate}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: left; color: #333;">${rowBranch}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #333;">${fmt(cashExp)}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #333;">${fmt(gcashExp)}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #333;">${fmt(gcashRec)}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #8b5cf6;">${fmt(coh)}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #10b981;">${fmt(dSales)}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #3b82f6;">${fmt(pAmt)}</td>
                                <td style="padding: 5px; border: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; text-align: right; color: #333;">${fmt(disc)}</td>
                            </tr>
                        `;
                    });
                }

                let htmlString = `
                    <div id="monthly-report-pdf-content" style="background: white; color: black; padding: 20px; font-family: Arial, Helvetica, sans-serif;">
                        <h2 style="text-align: center; margin-bottom: 2px; color: #111; font-weight: bold; font-size: 18px;">Monthly Income Report</h2>
                        <p style="text-align: center; margin-bottom: 2px; color: #333; font-size: 12px;">Period: ${startDate} to ${endDate}</p>
                        <p style="text-align: center; margin-bottom: 15px; color: #333; font-size: 12px;">Branch: ${branch}</p>

                        <h3 style="margin-top: 15px; margin-bottom: 5px; color: #111; font-size: 14px; border-bottom: 2px solid #111; padding-bottom: 2px;">Breakdown</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                            <tbody>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; width: 50%;">Total Cash Expense</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; color: #111; font-family: Arial, Helvetica, sans-serif;">${cashExpenseStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Total Gcash Expenses</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; color: #111; font-family: Arial, Helvetica, sans-serif;">${gcashExpenseStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Total Gcash Receivable</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; color: #111; font-family: Arial, Helvetica, sans-serif;">${gcashReceivableStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Total Cash on Hand</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; color: #111; font-family: Arial, Helvetica, sans-serif;">${cashOnHandStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Salary Expenses</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; color: #111; font-family: Arial, Helvetica, sans-serif;">${salaryExpensesStr}</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3 style="margin-top: 15px; margin-bottom: 5px; color: #111; font-size: 14px; border-bottom: 2px solid #111; padding-bottom: 2px;">Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                            <tbody>
                                <tr style="background-color: #f3f4f6;">
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: #10b981; width: 50%;">Monthly Sales (Income)</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #10b981; font-family: Arial, Helvetica, sans-serif;">${monthlySalesStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: #3b82f6;">Monthly Pondo Sales</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #3b82f6; font-family: Arial, Helvetica, sans-serif;">${pondoAmountStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: #d97706;">Monthly Expenses</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #d97706; font-family: Arial, Helvetica, sans-serif;">${monthlyExpensesStr}</td>
                                </tr>
                                <tr style="background-color: #f3f4f6;">
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: #059669; font-size: 13px;">Total Net Income</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #059669; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">${netIncomeStr}</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3 style="margin-top: 15px; margin-bottom: 5px; color: #111; font-size: 14px; border-bottom: 2px solid #111; padding-bottom: 2px;">Daily Records</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; page-break-inside: auto;">
                            <thead>
                                <tr style="background-color: #f3f4f6;">
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: left;">Date</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: left;">Branch</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Cash Exp</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Gcash Exp</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Gcash Rec</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Cash on Hand</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Daily Sales</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Pondo Amt</th>
                                    <th style="padding: 5px; border: 1px solid #e5e7eb; text-align: right;">Discrepancy</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>

                        <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #9ca3af;">
                            Generated By: ${sessionStorage.getItem('loggedInUser') || 'Admin'} <br>
                            MGH Daily Expenses | ${new Date().toLocaleString()}
                        </div>
                    </div>
                `;

                const hiddenDiv = document.createElement('div');
                hiddenDiv.innerHTML = htmlString;
                hiddenDiv.style.position = 'absolute';
                hiddenDiv.style.top = '-9999px';
                hiddenDiv.style.left = '-9999px';
                hiddenDiv.style.width = '800px'; 
                document.body.appendChild(hiddenDiv);
                
                const element = hiddenDiv.querySelector('#monthly-report-pdf-content');

                const opt = {
                    margin:       0.5,
                    filename:     `Monthly_Income_Report_${branch}_${startDate}_to_${endDate}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(element).output('bloburl').then(function(pdfUrl) {
                    if (newTab) {
                        newTab.location.href = pdfUrl;
                    }
                    document.body.removeChild(hiddenDiv);
                }).catch(err => {
                    console.error(err);
                    if (newTab) newTab.close();
                    document.body.removeChild(hiddenDiv);
                    alert("Failed to generate PDF");
                });

            } catch (err) {
                console.error(err);
                if (newTab) newTab.close();
                alert("Error: " + err.message);
            } finally {
                btnPrintMonthlyReport.disabled = false;
                if (btnText) btnText.classList.remove('hidden');
                if (spinner) spinner.classList.add('hidden');
            }
        });
    }

    window.monthlyDailyRecords = [];
    window.monthlyDailySortDesc = true;
    
    const renderMonthlyDailyRecords = () => {
        const tbody = document.querySelector('#monthly-daily-record-list-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!window.monthlyDailyRecords || window.monthlyDailyRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No saved Daily Records found for the selected date range and branch.</td></tr>';
            return;
        }
        
        const sorted = [...window.monthlyDailyRecords].sort((a, b) => {
            let dateA = new Date(a[0]);
            let dateB = new Date(b[0]);
            return window.monthlyDailySortDesc ? dateB - dateA : dateA - dateB;
        });

        const formatRowCurrency = (val) => {
            let num = parseFloat(val);
            if (isNaN(num)) return val;
            return '₱' + num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        };

        sorted.forEach(row => {
            const [rowDate, rowBranch, cashExp, gcashExp, gcashRec, cashOnHand, dailySales, pondoAmt, discrepancy] = row;
            let formattedDate = rowDate;
            if (rowDate && String(rowDate).includes('T')) {
                formattedDate = String(rowDate).split('T')[0];
            }

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 8px;">${formattedDate}</td>
                <td style="padding: 8px;">${rowBranch}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">${formatRowCurrency(cashExp)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">${formatRowCurrency(gcashExp)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">${formatRowCurrency(gcashRec)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; color: #a78bfa;">${formatRowCurrency(cashOnHand)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; color: #10b981;">${formatRowCurrency(dailySales)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; color: #60a5fa;">${formatRowCurrency(pondoAmt)}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; color: ${parseFloat(discrepancy) < 0 ? '#ef4444' : (parseFloat(discrepancy) > 0 ? '#34d399' : '#e2e8f0')};">${formatRowCurrency(discrepancy)}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const monthlyDailyHeader = document.getElementById('monthly-daily-date-header');
    if (monthlyDailyHeader) {
        monthlyDailyHeader.addEventListener('click', () => {
            window.monthlyDailySortDesc = !window.monthlyDailySortDesc;
            monthlyDailyHeader.innerHTML = `Date <i class="fas fa-sort-${window.monthlyDailySortDesc ? 'down' : 'up'}"></i>`;
            renderMonthlyDailyRecords();
        });
    }

    const btnMonthlySalesCheck = document.getElementById('btn-monthly-sales-check');
    if (btnMonthlySalesCheck) {
        btnMonthlySalesCheck.addEventListener('click', async () => {
            const startDate = document.getElementById('monthly-start-date').value;
            const endDate = document.getElementById('monthly-end-date').value;
            const branch = document.getElementById('monthly-branch').value;
            
            if (!startDate || !endDate) {
                alert("Please select both Start Date and End Date.");
                return;
            }

            const btnText = btnMonthlySalesCheck.querySelector('.btn-text');
            const spinner = btnMonthlySalesCheck.querySelector('.spinner');
            btnMonthlySalesCheck.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            try {
                const formData = {
                    action: 'getDailyRecordsByRange',
                    startDate: startDate,
                    endDate: endDate,
                    branch: branch
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    window.monthlyDailyRecords = result.data;
                    renderMonthlyDailyRecords();
                    document.getElementById('monthly-daily-record-list-container').classList.remove('hidden');
                } else {
                    alert("Error: " + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert("Fetch Error: " + error.message);
            } finally {
                btnMonthlySalesCheck.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    const btnDailySalesCheck = document.getElementById('btn-daily-sales-check');
    if (btnDailySalesCheck) {
        btnDailySalesCheck.addEventListener('click', async () => {
            const startDate = document.getElementById('admin-start-date').value;
            const branch = document.getElementById('admin-branch').value;
            
            if (!startDate) {
                alert("Please select a Date.");
                return;
            }

            const btnText = btnDailySalesCheck.querySelector('.btn-text');
            const spinner = btnDailySalesCheck.querySelector('.spinner');
            btnDailySalesCheck.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            try {
                const formData = {
                    action: 'getDailyCheckList',
                    date: startDate,
                    branch: branch
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    const rows = result.data;
                    const container = document.getElementById('daily-sales-list-container');
                    const tbody = document.querySelector('#daily-sales-list-table tbody');
                    tbody.innerHTML = '';

                    if (!rows || rows.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No saved Daily Checks found for the selected date and branch.</td></tr>';
                    } else {
                        rows.forEach(row => {
                            const [rowDate, rowBranch, cashExp, gcashExp, gcashRec, cashOnHand, dailySales, pondoAmt, discrepancy] = row;
                            const rowIndex = row[row.length - 1]; // Extracted from row array added in getDailyCheckList
                            
                            // Format date properly if it's an ISO string
                            let formattedDate = rowDate;
                            if (rowDate && String(rowDate).includes('T')) {
                                formattedDate = String(rowDate).split('T')[0];
                            }

                            const formatRowCurrency = (val) => {
                                let num = parseFloat(val);
                                if (isNaN(num)) return val;
                                return '₱' + num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            };

                            const tr = document.createElement('tr');
                            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                            tr.innerHTML = `
                                <td style="padding: 8px;">${formattedDate}</td>
                                <td style="padding: 8px;">${rowBranch}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace;">${formatRowCurrency(cashExp)}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace;">${formatRowCurrency(gcashExp)}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace;">${formatRowCurrency(gcashRec)}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; color: #a78bfa;">${formatRowCurrency(cashOnHand)}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; color: #10b981;">${formatRowCurrency(dailySales)}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; color: #60a5fa;">${formatRowCurrency(pondoAmt)}</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; color: ${parseFloat(discrepancy) < 0 ? '#ef4444' : (parseFloat(discrepancy) > 0 ? '#34d399' : '#e2e8f0')};">${formatRowCurrency(discrepancy)}</td>
                                <td style="padding: 8px; text-align: right;">
                                    <button class="delete-daily-check-btn" data-row="${rowIndex}" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            `;
                            
                            const deleteBtn = tr.querySelector('.delete-daily-check-btn');
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', async () => {
                                showConfirm(
                                    'Delete Daily Check Record',
                                    'Are you sure you want to delete this record? This cannot be undone.',
                                    async () => {
                                        deleteBtn.disabled = true;
                                        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                                        try {
                                            const deleteResponse = await fetch(SCRIPT_URL, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                                                body: JSON.stringify({
                                                    action: 'deleteDailyCheck',
                                                    rowIndex: rowIndex,
                                                    encodedBy: sessionStorage.getItem('loggedInUser')
                                                })
                                            });
                                            const deleteResult = await deleteResponse.json();
                                            if (deleteResult.status === 'success') {
                                                showToast('Daily check record deleted.', 'success');
                                                btnDailySalesCheck.click();
                                            } else {
                                                showToast('Error deleting record: ' + deleteResult.message, 'error');
                                                deleteBtn.disabled = false;
                                                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                                            }
                                        } catch (err) {
                                            showToast('Failed to delete record: ' + err.message, 'error');
                                            deleteBtn.disabled = false;
                                            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                                        }
                                    }
                                );
                            });
                            }
                            
                            tbody.appendChild(tr);
                        });
                    }
                    container.classList.remove('hidden');
                } else {
                    alert("Error: " + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert("Fetch Error: " + error.message);
            } finally {
                btnDailySalesCheck.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    function buildReportHTML(data, reportType, startDate, endDate, branch, prefix) {
        if (!data || data.length === 0) {
            return `<p style="color: var(--text-muted); margin-top: 20px;">No records found for the selected filters.</p>`;
        }

        // Determine column indices for Date and Amount
        let dateIdx = 1;
        let amountIdx = 3;
        
        if (reportType === 'Cash Expense') { dateIdx = 1; amountIdx = 3; }
        if (reportType === 'Gcash Expense') { dateIdx = 1; amountIdx = 4; }
        if (reportType === 'Gcash Receivable') { dateIdx = 1; amountIdx = 6; }
        if (reportType === 'Remitted Amount') { dateIdx = 0; amountIdx = 2; }
        if (reportType === 'Cash on Hand') { dateIdx = 1; amountIdx = 2; }

        // Group by Date
        const grouped = {};
        let grandTotal = 0;

        data.forEach(row => {
            let rowDateRaw = row[dateIdx];
            let rowDate = "";
            if (rowDateRaw) {
               try {
                   rowDate = rowDateRaw.toString().split('T')[0];
               } catch(e) {
                   rowDate = rowDateRaw.toString();
               }
            } else {
               rowDate = "Unknown Date";
            }
            
            if (!grouped[rowDate]) {
                grouped[rowDate] = { rows: [], total: 0 };
            }
            
            grouped[rowDate].rows.push(row);
            const amt = parseFloat(row[amountIdx]) || 0;
            grouped[rowDate].total += amt;
            grandTotal += amt;
        });

        const sortedDates = Object.keys(grouped).sort();

        const formatCurrency = (num) => Number(num).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        let tableHeader = '';
        if (reportType === 'Cash Expense') {
            tableHeader = `<th>Branch</th><th>Description</th><th style="text-align: center;">Amount</th><th>Encoded By</th>`;
        } else if (reportType === 'Gcash Expense') {
            tableHeader = `<th>Branch</th><th>Payment Method</th><th>Reference</th><th style="text-align: center;">Amount</th><th>Encoded By</th>`;
        } else if (reportType === 'Gcash Receivable') {
            tableHeader = `<th>Branch</th><th>Customer</th><th>Hrs</th><th>Payment Method</th><th>Reference</th><th style="text-align: center;">Amount</th><th>Encoded By</th>`;
        } else if (reportType === 'Remitted Amount') {
            tableHeader = `<th>Branch</th><th>Bank Name</th><th style="text-align: center;">Amount</th><th>Encoded By</th>`;
        } else if (reportType === 'Cash on Hand') {
            tableHeader = `<th>Branch</th><th style="text-align: center;">Amount Per Shift</th><th>Encoded By</th>`;
        }

        let html = `
            <div id="${prefix}-pdf-content-wrapper" style="margin-top: 20px; background: white; color: black; padding: 30px; text-align: left; border-radius: 8px; font-family: 'Inter', sans-serif;">
                <h2 style="text-align: center; margin-bottom: 5px; color: #111; font-weight: 700;">${reportType} Report</h2>
                <p style="text-align: center; margin-bottom: 5px; color: #555;">Date: ${startDate} to ${endDate}</p>
                <p style="text-align: center; margin-bottom: 20px; color: #555;">Branch: ${branch}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f3f4f6; color: #333; text-align: left;">
                            ${tableHeader}
                        </tr>
                    </thead>
                    <tbody>
        `;

        sortedDates.forEach(date => {
            html += `
                <tr style="background-color: #e5e7eb; font-weight: bold; color: #1f2937;">
                    <td colspan="10" style="padding: 8px; border: 1px solid #d1d5db;">Date: ${date}</td>
                </tr>
            `;
            
            grouped[date].rows.forEach(row => {
                html += `<tr style="color: #374151;">`;
                if (reportType === 'Cash Expense') {
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[0]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[2]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace;">₱${formatCurrency(row[3])}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[5] || ''}</td>`;
                } else if (reportType === 'Gcash Expense') {
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[0]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[3]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[5]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace;">₱${formatCurrency(row[4])}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[7] || ''}</td>`;
                } else if (reportType === 'Gcash Receivable') {
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[0]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[2] || ''}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[3] || ''}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[4] || ''}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[5] || ''}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace;">₱${formatCurrency(row[6])}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[8] || ''}</td>`;
                } else if (reportType === 'Remitted Amount') {
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[5] || ''}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[1]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace;">₱${formatCurrency(row[2])}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[4] || ''}</td>`;
                } else if (reportType === 'Cash on Hand') {
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[0]}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace;">₱${formatCurrency(row[2])}</td>`;
                    html += `<td style="padding: 8px; border: 1px solid #e5e7eb;">${row[3] || ''}</td>`;
                }
                html += `</tr>`;
            });
            
            // Subtotal
            html += `
                <tr style="background-color: #f9fafb; font-weight: 600; color: #111;">
                    <td colspan="${reportType === 'Remitted Amount' ? 2 : (reportType === 'Cash on Hand' ? 1 : (reportType === 'Cash Expense' ? 2 : (reportType === 'Gcash Receivable' ? 5 : 3)))}" style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Sub-total for ${date}:</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace; color: #2563eb;">₱${formatCurrency(grouped[date].total)}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 20px;">
                    <h3 style="color: #111; font-weight: 700;">Grand Total: <span style="font-family: monospace; color: #ef4444; font-size: 1.2em;">₱${formatCurrency(grandTotal)}</span></h3>
                </div>
                <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af;">
                    Generated by MGH Daily Expenses | ${new Date().toLocaleString()}
                </div>
            </div>
        `;

        return html;
    }

    // Load Audit Logs
    async function loadAuditLogs() {
        const tbody = document.getElementById('audit-report-tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading audit logs...</td></tr>';

        try {
            const formData = {
                action: 'getAuditLogs'
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (result.status === 'success') {
                const logs = result.data || [];
                if (logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #6b7280;">No audit logs found.</td></tr>';
                } else {
                    let html = '';
                    logs.forEach(log => {
                        html += `
                            <tr>
                                <td style="font-family: monospace; color: #4b5563;">${log[0] || ''}</td>
                                <td style="font-weight: 500;">${log[1] || ''}</td>
                                <td><span style="background-color: rgba(59, 130, 246, 0.1); color: #2563eb; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${log[2] || ''}</span></td>
                                <td>${log[3] || ''}</td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Error: ${result.message}</td></tr>`;
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Network error. Please try again later.</td></tr>';
        }
    }

    // Print Report Logic
    const btnPrintReport = document.getElementById('btn-print-report');
    if (btnPrintReport) {
        btnPrintReport.addEventListener('click', async () => {
            const startDate = document.getElementById('admin-start-date').value;
            const branch = document.getElementById('admin-branch').value;
            
            if (!startDate) {
                alert("Please select a Date first.");
                return;
            }

            // Generate Report will only use Date and Branch, and fetch everything else from backend
            const btnText = btnPrintReport.querySelector('.btn-text');
            const spinner = btnPrintReport.querySelector('.spinner');
            btnPrintReport.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (spinner) spinner.classList.remove('hidden');

            // Open new tab synchronously
            const newTab = window.open('', '_blank');
            if (newTab) {
                newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Fetching data and generating PDF Report, please wait...</h3>');
            } else {
                alert('Popup blocked! Please allow popups for this site to view the PDF.');
            }

            try {
                // Fetch the detailed rows
                const formData = {
                    action: 'getReconciliationData',
                    startDate: startDate,
                    endDate: startDate,
                    branch: branch
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                if (result.status !== 'success') {
                    throw new Error(result.message || 'Error fetching data');
                }

                const data = result.data;
                const formatCurrency = (num) => Number(num).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

                // Helper to build table
                const buildTable = (title, headers, rows, amountIdx) => {
                    if (!rows || rows.length === 0) return '';
                    let tableHtml = `
                        <h3 style="margin-top: 15px; margin-bottom: 5px; color: #333; font-size: 13px; border-bottom: 2px solid #e5e7eb; padding-bottom: 2px;">${title}</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px;">
                            <thead>
                                <tr style="background-color: #f3f4f6; color: #333; text-align: left;">
                    `;
                    headers.forEach(h => { tableHtml += `<th style="padding: 4px; border: 1px solid #e5e7eb;">${h}</th>`; });
                    tableHtml += `</tr></thead><tbody>`;
                    
                    let subTotal = 0;
                    rows.forEach(row => {
                        tableHtml += `<tr style="border-bottom: 1px solid #e5e7eb;">`;
                        for(let i = 0; i < row.length; i++) {
                            let cellVal = row[i] || '';
                            if (i === amountIdx) {
                                subTotal += parseFloat(cellVal) || 0;
                                tableHtml += `<td style="padding: 4px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #111;">₱${formatCurrency(cellVal)}</td>`;
                            } else {
                                tableHtml += `<td style="padding: 4px; border: 1px solid #e5e7eb;">${cellVal}</td>`;
                            }
                        }
                        tableHtml += `</tr>`;
                    });
                    
                    // Subtotal Row
                    tableHtml += `
                        <tr style="background-color: #f9fafb; font-weight: 600;">
                            <td colspan="${headers.length - 1}" style="padding: 4px; border: 1px solid #e5e7eb; text-align: right;">Subtotal:</td>
                            <td style="padding: 4px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #111;">₱${formatCurrency(subTotal)}</td>
                        </tr>
                    `;
                    
                    tableHtml += `</tbody></table>`;
                    return tableHtml;
                };

                // Recompute total income properly from fetched data
                const computedIncome = data.cashOnHand + data.gcashReceivable + data.cashExpense - data.gcashExpense;
                const totalIncome = `₱${formatCurrency(computedIncome)}`;
                const cashExpText = `₱${formatCurrency(data.cashExpense)}`;
                const gcashExpText = `₱${formatCurrency(data.gcashExpense)}`;
                const gcashRecText = `₱${formatCurrency(data.gcashReceivable)}`;
                const cashOnHandText = `₱${formatCurrency(data.cashOnHand)}`;
                
                // Fetch saved Pondo, Discrepancy, Remarks from backend data
                const savedPondo = data.pondoAmount !== null ? `₱${formatCurrency(data.pondoAmount)}` : 'N/A';
                const savedDiscrepancy = data.discrepancyStr || 'N/A';
                const savedRemarks = data.remarks || 'None';

                // Build HTML
                let htmlString = `
                    <div id="general-report-pdf-content" style="background: white; color: black; padding: 20px; font-family: Arial, Helvetica, sans-serif;">
                        <h2 style="text-align: center; margin-bottom: 2px; color: #111; font-weight: bold; font-size: 18px;">Daily Check and Balance</h2>
                        <p style="text-align: center; margin-bottom: 2px; color: #333; font-size: 12px;">Date: ${startDate}</p>
                        <p style="text-align: center; margin-bottom: 15px; color: #333; font-size: 12px;">Branch: ${branch}</p>
                `;

                // Cash Expenses (Branch, Date, Desc, Amt, Receipt, Encoded)
                htmlString += buildTable('Cash Expenses', ['Branch', 'Date', 'Description', 'Amount', 'Receipt', 'Encoded By'], data.cashExpenseRows, 3);
                
                // Gcash Expenses (Branch, Date, Details, Method, Amt, Ref, Receipt, Encoded)
                htmlString += buildTable('Gcash Expenses', ['Branch', 'Date', 'Details', 'Payment Method', 'Amount', 'Reference#', 'Receipt', 'Encoded By'], data.gcashExpenseRows, 4);

                // Gcash Receivable (Remove Employee Name at index 7)
                const filteredGcashReceivableRows = data.gcashReceivableRows ? data.gcashReceivableRows.map(row => {
                    // row is [Branch, Date, Cust, Hrs, Method, Ref, Amt, Emp, Encoded]
                    // We remove Emp (index 7)
                    return [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[8]];
                }) : [];
                htmlString += buildTable('Gcash Receivable', ['Branch', 'Date', 'Customer Name', 'No of Hours', 'Payment Method', 'Reference#', 'Amount', 'Encoded By'], filteredGcashReceivableRows, 6);

                // Cash on Hand (Branch, Date, Amt, Receipt, Encoded)
                htmlString += buildTable('Cash on Hand', ['Branch', 'Date', 'Amount', 'Encoded By'], data.cashOnHandRows, 2);

                // Add the Summary block
                htmlString += `
                        <h3 style="margin-top: 15px; margin-bottom: 5px; color: #111; font-size: 14px; border-bottom: 2px solid #111; padding-bottom: 2px;">Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
                            <tbody>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; width: 50%;">Total Cash Expense</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #111;">${cashExpText}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Total Gcash Expenses</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #111;">${gcashExpText}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Total Gcash Receivable</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #111;">${gcashRecText}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold;">Total Cash on Hand</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #111;">${cashOnHandText}</td>
                                </tr>
                                <tr style="background-color: #f3f4f6;">
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: #10b981;">Total Income (Daily Sales)</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #10b981;">${totalIncome}</td>
                                </tr>
                            </tbody>
                        </table>
                `;

                if (savedPondo !== 'N/A') {
                    htmlString += `
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
                            <tbody>
                                <tr style="background-color: #f3f4f6;">
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: #3b82f6; width: 50%;">Pondo Amount</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: #3b82f6;">${savedPondo}</td>
                                </tr>
                                <tr style="background-color: ${savedDiscrepancy === 'Balance' ? '#d1fae5' : '#fee2e2'};">
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: bold; color: ${savedDiscrepancy === 'Balance' ? '#059669' : '#dc2626'};">Discrepancy</td>
                                    <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; color: ${savedDiscrepancy === 'Balance' ? '#059669' : '#dc2626'};">${savedDiscrepancy === 'Balance' ? 'Balance' : (typeof savedDiscrepancy === 'number' || !isNaN(parseFloat(savedDiscrepancy)) ? '₱' + formatCurrency(parseFloat(savedDiscrepancy)) : savedDiscrepancy)}</td>
                                </tr>
                            </tbody>
                        </table>
                    `;
                    
                    if (savedRemarks && savedRemarks !== 'None') {
                        htmlString += `
                            <div style="margin-top: 10px; padding: 10px; border: 1px solid #e5e7eb; background: #fffbeb;">
                                <strong style="color: #d97706; font-size: 11px;">Remarks / Discrepancy Reason:</strong>
                                <p style="margin-top: 4px; margin-bottom: 0; color: #4b5563; font-size: 11px;">${savedRemarks}</p>
                            </div>
                        `;
                    }
                }

                htmlString += `
                        <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #9ca3af;">
                            Encoded By: ${sessionStorage.getItem('loggedInUser') || 'Admin'} <br>
                            Generated by MGH Daily Expenses | ${new Date().toLocaleString()}
                        </div>
                    </div>
                `;

                // Create off-screen container for html2pdf
                const hiddenDiv = document.createElement('div');
                hiddenDiv.innerHTML = htmlString;
                hiddenDiv.style.position = 'absolute';
                hiddenDiv.style.top = '-9999px';
                hiddenDiv.style.left = '-9999px';
                hiddenDiv.style.width = '800px'; 
                document.body.appendChild(hiddenDiv);
                
                const element = hiddenDiv.querySelector('#general-report-pdf-content');

                const opt = {
                    margin:       0.5,
                    filename:     `Daily_Check_Balance_${branch}_${startDate}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(element).output('bloburl').then(function(pdfUrl) {
                    if (newTab) {
                        newTab.location.href = pdfUrl;
                    }
                    document.body.removeChild(hiddenDiv);
                }).catch(err => {
                    console.error(err);
                    if (newTab) newTab.close();
                    document.body.removeChild(hiddenDiv);
                    alert("Failed to generate PDF");
                });

            } catch (err) {
                console.error(err);
                if (newTab) newTab.close();
                alert("Error: " + err.message);
            } finally {
                btnPrintReport.disabled = false;
                if (btnText) btnText.classList.remove('hidden');
                if (spinner) spinner.classList.add('hidden');
            }
        });
    }

    // Save Daily Check Logic
    const btnSaveDailyCheck = document.getElementById('btn-save-daily-check');
    if (btnSaveDailyCheck) {
        btnSaveDailyCheck.addEventListener('click', async () => {
            const startDate = document.getElementById('admin-start-date').value;
            const branch = document.getElementById('admin-branch').value;
            
            if (!startDate) {
                alert("Please select a Date first before saving.");
                return;
            }
            
            const remarksContainer = document.getElementById('recon-remarks-container');
            const remarksInput = document.getElementById('recon-remarks').value.trim();
            
            if (!remarksContainer.classList.contains('hidden') && !remarksInput) {
                alert("Please enter a remark explaining the discrepancy before saving.");
                document.getElementById('recon-remarks').focus();
                return;
            }

            const statusMessage = document.getElementById('save-daily-status-message');
            const btnText = btnSaveDailyCheck.querySelector('.btn-text');
            const spinner = btnSaveDailyCheck.querySelector('.spinner');
            
            btnSaveDailyCheck.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            try {
                // Remove the peso sign and commas to get clean numbers
                const parseCurrency = (id) => {
                    let val = document.getElementById(id).value.replace(/[^0-9.-]+/g,"");
                    return val ? parseFloat(val) : 0;
                };

                const discrepancyValue = parseCurrency('recon-discrepancy');
                let remarksValue = document.getElementById('recon-remarks').value.trim();
                
                if (discrepancyValue === 0) {
                    remarksValue = "Balanced";
                }

                const formData = {
                    action: 'saveDailyCheck',
                    date: startDate,
                    branch: branch,
                    cashExpense: parseCurrency('recon-cash-expense'),
                    gcashExpenses: parseCurrency('recon-gcash-expense'),
                    gcashReceivable: parseCurrency('recon-gcash-receivable'),
                    cashOnHand: parseCurrency('recon-cash-on-hand'),
                    dailySales: parseCurrency('recon-total-income'), // Maps Total Income to Daily Sales
                    pondoAmount: parseCurrency('recon-pondo-amount'),
                    discrepancy: discrepancyValue,
                    remarks: remarksValue,
                    encodedBy: sessionStorage.getItem('loggedInUser')
                };

                const urlEncodedData = new URLSearchParams(formData).toString();

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: urlEncodedData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showMessage(statusMessage, 'Saved to Daily Check & Balance!', 'success');
                    
                    // Reset everything to 0/empty
                    document.getElementById('admin-start-date').value = '';
                    document.getElementById('admin-branch').value = 'All';
                    document.getElementById('recon-cash-expense').value = '₱0.00';
                    document.getElementById('recon-gcash-expense').value = '₱0.00';
                    document.getElementById('recon-gcash-receivable').value = '₱0.00';
                    document.getElementById('recon-cash-on-hand').value = '₱0.00';
                    document.getElementById('recon-pondo-amount').value = '';
                    document.getElementById('recon-total-income').value = '₱0.00';
                    document.getElementById('recon-discrepancy').value = '₱0.00';
                    document.getElementById('recon-discrepancy').style.color = '#ef4444';
                    document.getElementById('recon-remarks').value = '';
                    document.getElementById('recon-remarks-container').classList.add('hidden');
                    
                    if (typeof currentReconTotals !== 'undefined') {
                        currentReconTotals.cashExpense = 0;
                        currentReconTotals.gcashExpense = 0;
                        currentReconTotals.gcashReceivable = 0;
                        currentReconTotals.cashOnHand = 0;
                    }
                } else {
                    showMessage(statusMessage, 'Error: ' + result.message, 'error');
                }
            } catch (error) {
                console.error(error);
                showMessage(statusMessage, 'Failed to save data.', 'error');
            } finally {
                btnSaveDailyCheck.disabled = false;
                btnText.classList.remove('hidden');
            }
        });
    }

    // ======= Warranty Form Logic =======
    const warrantyForm = document.getElementById('warranty-form');
    if (warrantyForm) {
        warrantyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('warranty-date').value;
            const branch = document.getElementById('warranty-branch').value;
            const tech = document.getElementById('warranty-tech').value;
            const itemDescription = document.getElementById('warranty-item').value;
            const serial = document.getElementById('warranty-serial').value;
            const pc = document.getElementById('warranty-pc').value;
            const qty = document.getElementById('warranty-qty').value;
            const issue = document.getElementById('warranty-issue').value;
            const approver = document.getElementById('warranty-approver').value;
            const status = document.getElementById('warranty-status').value;
            const warrantyNumber = document.getElementById('warranty-number').value;
            const rowIndex = document.getElementById('warranty-row-index').value;
            
            const submitBtn = document.getElementById('btn-save-warranty');
            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.spinner');
            const statusMessage = document.getElementById('warranty-status-message');
            
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            const loggedInUser = sessionStorage.getItem('loggedInUser') || 'Unknown';

            try {
                let formData = {};
                if (rowIndex) {
                    formData = {
                        action: 'updateExpenseRecord',
                        sheetName: 'Warranty Items',
                        rowIndex: rowIndex,
                        updatedData: [date, branch, tech, itemDescription, serial, pc, qty, issue, approver, status, warrantyNumber],
                        encodedBy: loggedInUser
                    };
                } else {
                    formData = {
                        action: 'addWarrantyItem',
                        date: date,
                        branch: branch,
                        tech: tech,
                        itemDescription: itemDescription,
                        serial: serial,
                        pc: pc,
                        qty: qty,
                        issue: issue,
                        approver: approver,
                        status: status,
                        warrantyNumber: warrantyNumber,
                        encodedBy: loggedInUser
                    };
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': rowIndex ? 'text/plain;charset=utf-8' : 'application/x-www-form-urlencoded' },
                    body: rowIndex ? JSON.stringify(formData) : new URLSearchParams(formData)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    statusMessage.textContent = 'Warranty Record saved successfully!';
                    statusMessage.className = 'status-message success';
                    warrantyForm.reset();
                    document.getElementById('warranty-row-index').value = '';
                    document.getElementById('warranty-date').valueAsDate = new Date();
                    
                    const savedRole = sessionStorage.getItem('userRole');
                    if (savedRole !== 'Supervisor' && savedRole !== 'Manager' && savedRole !== 'Owner') {
                        alert("paki coordinate sa inyo supervisor or manager yung approval ng warranty!. Dapat approve nila.");
                    }
                    
                } else {
                    statusMessage.textContent = result.message || 'Failed to save warranty record.';
                    statusMessage.className = 'status-message error';
                }
            } catch (error) {
                statusMessage.textContent = 'Error connecting to the server.';
                statusMessage.className = 'status-message error';
            } finally {
                statusMessage.classList.remove('hidden');
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
                
                setTimeout(() => {
                    statusMessage.classList.add('hidden');
                }, 3000);
            }
        });
    }

    // ======= Handover Logic =======
    const handoverForm = document.getElementById('handover-form');
    
    if (handoverForm) {
        handoverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('handover-date').value;
            const branch = document.getElementById('handover-branch').value;
            const outgoingStaff = document.getElementById('handover-outgoing-staff').value;
            const incomingStaff = document.getElementById('handover-incoming-staff').value;
            const description = document.getElementById('handover-description').value;
            const discussion = document.getElementById('handover-discussion').value;
            const remarks = document.getElementById('handover-remarks').value;
            const approver = document.getElementById('handover-approver').value;
            const status = document.getElementById('handover-status').value;
            const rowIndex = document.getElementById('handover-row-index').value;

            const btnSave = document.getElementById('btn-save-handover');
            const btnText = btnSave.querySelector('.btn-text');
            const spinner = btnSave.querySelector('.spinner');
            const statusMessage = document.getElementById('handover-status-message');

            const userRole = sessionStorage.getItem('userRole');
            if (userRole !== 'Supervisor' && userRole !== 'Manager' && userRole !== 'Owner') {
                if (outgoingStaff && approver && outgoingStaff === approver) {
                    statusMessage.textContent = 'Error: Outgoing Staff and Approver cannot be the same person.';
                    statusMessage.className = 'error-message';
                    statusMessage.classList.remove('hidden');
                    setTimeout(() => { statusMessage.classList.add('hidden'); }, 3000);
                    return;
                }

                if (incomingStaff && approver && incomingStaff !== approver) {
                    statusMessage.textContent = 'Error: Incoming Staff must match the Logged-in Approver.';
                    statusMessage.className = 'error-message';
                    statusMessage.classList.remove('hidden');
                    setTimeout(() => { statusMessage.classList.add('hidden'); }, 3000);
                    return;
                }
            }
            
            btnSave.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            try {
                const formData = {
                    action: rowIndex ? 'updateExpenseRecord' : 'addHandover',
                    date: date,
                    branch: branch,
                    outgoingStaff: outgoingStaff,
                    description: description,
                    discussion: discussion,
                    status: status,
                    incomingStaff: incomingStaff,
                    remarks: remarks,
                    approver: approver,
                    encodedBy: sessionStorage.getItem('loggedInUser') || 'Unknown'
                };
                
                if (rowIndex) {
                    formData.sheetName = 'Handover';
                    formData.rowIndex = rowIndex;
                    formData.updatedData = [date, branch, outgoingStaff, description, discussion, status, incomingStaff, remarks, approver];
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    statusMessage.textContent = 'Handover record saved successfully!';
                    statusMessage.className = 'success-message';
                    handoverForm.reset();
                    document.getElementById('handover-row-index').value = '';
                    document.getElementById('handover-date').valueAsDate = new Date();
                    document.getElementById('handover-approver').value = sessionStorage.getItem('loggedInUser');
                    if (document.getElementById('handover-status').disabled) {
                        document.getElementById('handover-status').value = 'In Progress';
                    }
                } else {
                    statusMessage.textContent = 'Error: ' + result.message;
                    statusMessage.className = 'error-message';
                }
            } catch (error) {
                statusMessage.textContent = 'Error: Could not connect to the server.';
                statusMessage.className = 'error-message';
            } finally {
                btnSave.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
                statusMessage.classList.remove('hidden');
                
                setTimeout(() => {
                    statusMessage.classList.add('hidden');
                }, 3000);
            }
        });
    }

    // ======= Daily Survey Logic =======
    const dailySurveyForm = document.getElementById('daily-survey-form');
    if (dailySurveyForm) {
        dailySurveyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('survey-date').value;
            const branch = document.getElementById('survey-branch').value;
            const time = document.getElementById('survey-time').value;
            const count = document.getElementById('survey-count').value;
            
            const btnSaveSurvey = document.getElementById('btn-save-survey');
            const btnText = btnSaveSurvey.querySelector('.btn-text');
            const spinner = btnSaveSurvey.querySelector('.spinner');
            const statusMessage = document.getElementById('survey-status-message');
            
            btnSaveSurvey.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            try {
                const formData = {
                    action: 'saveDailySurvey',
                    date: date,
                    branch: branch,
                    time: time,
                    count: count,
                    encodedBy: sessionStorage.getItem('loggedInUser')
                };

                const urlEncodedData = new URLSearchParams(formData).toString();

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: urlEncodedData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    showMessage(statusMessage, 'Daily survey saved successfully!', 'success');
                    dailySurveyForm.reset();
                    document.getElementById('survey-date').valueAsDate = new Date();
                } else {
                    showMessage(statusMessage, 'Failed to save survey. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error saving survey:', error);
                showMessage(statusMessage, 'An error occurred. Please check your connection.', 'error');
            } finally {
                btnSaveSurvey.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    let surveyChartInstance = null;
    const generateSurveyReportForm = document.getElementById('generate-survey-report-form');
    if (generateSurveyReportForm) {
        generateSurveyReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const startDate = document.getElementById('report-survey-start-date').value;
            const endDate = document.getElementById('report-survey-end-date').value;
            const selectedBranch = document.getElementById('report-survey-branch').value;
            
            const submitBtn = generateSurveyReportForm.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.spinner');
            const tbody = document.getElementById('survey-report-tbody');

            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">Loading...</td></tr>';

            try {
                const formData = {
                    action: 'getExpenseRecords',
                    sheetName: 'Daily Survey',
                    startDate: startDate,
                    endDate: endDate,
                    branch: selectedBranch
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                tbody.innerHTML = '';
                
                if (result.status === 'success' && result.data && result.data.length > 0) {
                    let filteredData = result.data;
                    
                    // Frontend branch filtering (Branch is at index 1 for Daily Survey)
                    if (selectedBranch && selectedBranch !== 'All') {
                        filteredData = filteredData.filter(row => row[1] === selectedBranch);
                    }
                    
                    if (filteredData.length === 0) {
                         tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">No surveys found for this filter.</td></tr>';
                         if (surveyChartInstance) { surveyChartInstance.destroy(); }
                         return;
                    }

                    window.currentSurveyRecords = filteredData;
                    window.surveySortDesc = true; // default to newest first or whatever, actually default false
                    window.renderSurveyReport();

                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">No surveys found for this date.</td></tr>';
                    if (surveyChartInstance) { surveyChartInstance.destroy(); }
                }
            } catch (error) {
                console.error('Error fetching survey report:', error);
                tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: #ef4444;">Error fetching data. Please try again.</td></tr>';
                if (surveyChartInstance) { surveyChartInstance.destroy(); }
            } finally {
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    const btnPrintSurvey = document.getElementById('btn-print-survey-report');
    if (btnPrintSurvey) {
        btnPrintSurvey.addEventListener('click', () => {
            const startDate = document.getElementById('report-survey-start-date').value;
            const endDate = document.getElementById('report-survey-end-date').value;
            const branch = document.getElementById('report-survey-branch').value;
            const tbodyHTML = document.getElementById('survey-report-tbody').innerHTML;

            const btnText = btnPrintSurvey.querySelector('.btn-text');
            const originalText = btnText.innerHTML;
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btnPrintSurvey.disabled = true;

            const newTab = window.open('', '_blank');
            if (newTab) {
                newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating PDF Report, please wait...</h3>');
            } else {
                alert('Popup blocked! Please allow popups for this site to view the PDF.');
            }

            try {
                let chartImgHTML = '';
                const canvas = document.getElementById('surveyChart');
                if (canvas && window.surveyChartInstance) {
                    // Switch chart text/grid to dark for print
                    window.surveyChartInstance.options.scales.x.ticks.color = '#333';
                    window.surveyChartInstance.options.scales.x.grid.color = '#ddd';
                    window.surveyChartInstance.options.scales.y.ticks.color = '#333';
                    window.surveyChartInstance.options.scales.y.grid.color = '#ddd';
                    window.surveyChartInstance.options.plugins.legend.labels.color = '#333';
                    window.surveyChartInstance.update('none');

                    // Temporarily fill background with white to avoid transparent PNG rendering as black
                    const ctx = canvas.getContext('2d');
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    const chartDataUrl = canvas.toDataURL('image/jpeg', 1.0);
                    ctx.restore();
                    
                    // Revert chart to light text for UI
                    window.surveyChartInstance.options.scales.x.ticks.color = 'rgba(255, 255, 255, 0.7)';
                    window.surveyChartInstance.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.1)';
                    window.surveyChartInstance.options.scales.y.ticks.color = 'rgba(255, 255, 255, 0.7)';
                    window.surveyChartInstance.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
                    window.surveyChartInstance.options.plugins.legend.labels.color = 'rgba(255, 255, 255, 0.9)';
                    window.surveyChartInstance.update('none');

                    chartImgHTML = `<div style="text-align: center; margin: 20px 0;"><img src="${chartDataUrl}" style="max-width: 100%; height: auto; max-height: 250px; border: 1px solid #ddd; padding: 10px; border-radius: 4px;" /></div>`;
                }

                let htmlString = `
                    <div style="font-family: sans-serif; color: #333; padding: 20px; background: white; max-width: 800px; margin: 0 auto;">
                        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
                            <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 24px;">MGH Survey Report</h2>
                            <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Branch:</strong> ${branch}</p>
                            <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Period:</strong> ${startDate} to ${endDate}</p>
                        </div>
                        
                        ${chartImgHTML}

                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; margin-top: 20px;">
                            <thead>
                                <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                    <th style="padding: 10px; color: #334155;">Date</th>
                                    <th style="padding: 10px; color: #334155;">Branch</th>
                                    <th style="padding: 10px; color: #334155;">Time</th>
                                    <th style="padding: 10px; color: #334155;">Count</th>
                                    <th style="padding: 10px; color: #334155;">Logged In</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tbodyHTML.replace(/rgba\(255,255,255,0\.05\)/g, '#e2e8f0').replace(/color:\s*var\(--text-muted\)/g, 'color: #64748b')}
                            </tbody>
                        </table>
                        <div style="margin-top: 30px; text-align: right; font-size: 11px; color: #94a3b8;">
                            <p>Generated on ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                `;

                const hiddenDiv = document.createElement('div');
                hiddenDiv.innerHTML = htmlString;
                hiddenDiv.style.position = 'absolute';
                hiddenDiv.style.top = '-9999px';
                hiddenDiv.style.left = '-9999px';
                hiddenDiv.style.width = '800px';
                document.body.appendChild(hiddenDiv);

                const opt = {
                    margin:       0.5,
                    filename:     `Survey_Report_${startDate}_to_${endDate}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                const elementToPrint = hiddenDiv.firstElementChild;

                setTimeout(() => {
                    html2pdf().set(opt).from(elementToPrint).output('bloburl').then(function(pdfUrl) {
                        if (newTab) {
                            newTab.location.href = pdfUrl;
                        }
                        document.body.removeChild(hiddenDiv);
                        btnText.innerHTML = originalText;
                        btnPrintSurvey.disabled = false;
                    }).catch(err => {
                        console.error(err);
                        if (newTab) newTab.close();
                        document.body.removeChild(hiddenDiv);
                        btnText.innerHTML = originalText;
                        btnPrintSurvey.disabled = false;
                        alert('Failed to generate PDF.');
                    });
                }, 500);
            } catch (error) {
                console.error(error);
                if (newTab) newTab.close();
                btnText.innerHTML = originalText;
                btnPrintSurvey.disabled = false;
                alert('Failed to generate PDF.');
            }
        });
    }

    // --- Admin Attendance Report Logic ---
    const generateAttendanceReportForm = document.getElementById('generate-attendance-report-form');
    if (generateAttendanceReportForm) {
        generateAttendanceReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const startDate = document.getElementById('report-attendance-start-date').value;
            const endDate = document.getElementById('report-attendance-end-date').value;
            const branch = document.getElementById('report-attendance-branch').value;
            
            const submitBtn = generateAttendanceReportForm.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.spinner');
            const tbody = document.getElementById('attendance-report-tbody');
            
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;
            tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Generating report...</td></tr>';
            
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'getAllAttendance' })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    const data = result.data || [];
                    const filtered = data.filter(row => {
                        if (!row[1]) return false; // Date is col 1
                        const rowDateStr = new Date(row[1]).toISOString().split('T')[0];
                        const rowBranch = row[3] || ''; // Branch is col 3
                        
                        const isDateMatch = rowDateStr >= startDate && rowDateStr <= endDate;
                        const isBranchMatch = (branch === 'All') || (rowBranch === branch);
                        return isDateMatch && isBranchMatch;
                    });
                    
                    filtered.sort((a, b) => new Date(b[1]) - new Date(a[1]));
                    
                    if (filtered.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No attendance records found for this period.</td></tr>';
                    } else {
                        tbody.innerHTML = '';
                        filtered.forEach(row => {
                            const dateStr = row[1] ? new Date(row[1]).toISOString().split('T')[0] : '';
                            const emp = row[2] || '';
                            const b = row[3] || '';
                            const tIn = row[4] || '';
                            const tOut = row[5] || '';
                            const hrs = row[6] || '';
                            const status = row[7] || '';
                            const ot = row[8] || '0';
                            const late = row[9] || '0'; // col 9 is Late
                            
                            const tr = document.createElement('tr');
                            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                            tr.innerHTML = `
                                <td style="padding: 12px;">${dateStr}</td>
                                <td style="padding: 12px;">${emp}</td>
                                <td style="padding: 12px; color: var(--text-muted); font-size: 0.9em;">${b}</td>
                                <td style="padding: 12px;">${tIn}</td>
                                <td style="padding: 12px;">${tOut}</td>
                                <td style="padding: 12px; font-weight: 600;">${hrs}</td>
                                <td style="padding: 12px; color: ${late !== '0' && late !== '' ? 'var(--error)' : 'var(--text-muted)'};">${late}</td>
                                <td style="padding: 12px; color: ${ot !== '0' && ot !== '' ? 'var(--primary)' : 'var(--text-muted)'};">${ot}</td>
                                <td style="padding: 12px;"><span style="background: rgba(34, 197, 94, 0.1); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">${status}</span></td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--error);">Failed to load records.</td></tr>';
                }
            } catch (error) {
                console.error(error);
                tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--error);">Network error. Try again.</td></tr>';
            } finally {
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    const btnPrintAttendance = document.getElementById('btn-print-attendance-report');
    if (btnPrintAttendance) {
        btnPrintAttendance.addEventListener('click', () => {
            const startDate = document.getElementById('report-attendance-start-date').value;
            const endDate = document.getElementById('report-attendance-end-date').value;
            const branch = document.getElementById('report-attendance-branch').value;
            const tbodyHTML = document.getElementById('attendance-report-tbody').innerHTML;

            if (tbodyHTML.includes('Select a date') || tbodyHTML.includes('No attendance records found')) {
                alert('Please generate a report first.');
                return;
            }

            const btnText = btnPrintAttendance.querySelector('.btn-text');
            const originalText = btnText.innerHTML;
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btnPrintAttendance.disabled = true;

            const newTab = window.open('', '_blank');
            if (newTab) {
                newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating PDF Report, please wait...</h3>');
            } else {
                alert('Popup blocked! Please allow popups for this site to view the PDF.');
            }

            try {
                let htmlString = `
                    <div style="font-family: sans-serif; color: #333; padding: 20px; background: white; max-width: 1000px; margin: 0 auto;">
                        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
                            <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 24px;">Attendance Report</h2>
                            <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Branch:</strong> ${branch}</p>
                            <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Period:</strong> ${startDate} to ${endDate}</p>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; margin-top: 20px;">
                            <thead>
                                <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                    <th style="padding: 8px; color: #334155;">Date</th>
                                    <th style="padding: 8px; color: #334155;">Employee</th>
                                    <th style="padding: 8px; color: #334155;">Branch</th>
                                    <th style="padding: 8px; color: #334155;">Time In</th>
                                    <th style="padding: 8px; color: #334155;">Time Out</th>
                                    <th style="padding: 8px; color: #334155;">Hours</th>
                                    <th style="padding: 8px; color: #334155;">Late</th>
                                    <th style="padding: 8px; color: #334155;">OT Hours</th>
                                    <th style="padding: 8px; color: #334155;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tbodyHTML.replace(/rgba\(255,255,255,0\.05\)/g, '#e2e8f0').replace(/color:\s*var\(--text-muted\)/g, 'color: #64748b')}
                            </tbody>
                        </table>
                        <div style="margin-top: 30px; text-align: right; font-size: 11px; color: #94a3b8;">
                            <p>Generated on ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                `;

                const hiddenDiv = document.createElement('div');
                hiddenDiv.innerHTML = htmlString;
                hiddenDiv.style.position = 'absolute';
                hiddenDiv.style.top = '-9999px';
                hiddenDiv.style.left = '-9999px';
                hiddenDiv.style.width = '1000px';
                document.body.appendChild(hiddenDiv);

                const opt = {
                    margin:       0.5,
                    filename:     `Attendance_Report_${startDate}_to_${endDate}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
                };

                const elementToPrint = hiddenDiv.firstElementChild;

                setTimeout(() => {
                    html2pdf().set(opt).from(elementToPrint).output('bloburl').then(function(pdfUrl) {
                        if (newTab) {
                            newTab.location.href = pdfUrl;
                        }
                        document.body.removeChild(hiddenDiv);
                        btnText.innerHTML = originalText;
                        btnPrintAttendance.disabled = false;
                    }).catch(err => {
                        console.error(err);
                        if (newTab) newTab.close();
                        document.body.removeChild(hiddenDiv);
                        btnText.innerHTML = originalText;
                        btnPrintAttendance.disabled = false;
                        alert('Failed to generate PDF.');
                    });
                }, 500);
            } catch (error) {
                console.error(error);
                if (newTab) newTab.close();
                btnText.innerHTML = originalText;
                btnPrintAttendance.disabled = false;
                alert('Failed to generate PDF.');
            }
        });
    }

    const btnExportAttendanceExcel = document.getElementById('btn-export-attendance-excel');
    if (btnExportAttendanceExcel) {
        btnExportAttendanceExcel.addEventListener('click', () => {
            const table = document.getElementById('attendance-report-table');
            if (!table) return;
            const tbodyHTML = document.getElementById('attendance-report-tbody').innerHTML;
            if (tbodyHTML.includes('Select a date') || tbodyHTML.includes('No attendance records found')) {
                alert('Please generate a report first.');
                return;
            }
            
            const startDate = document.getElementById('report-attendance-start-date').value;
            const endDate = document.getElementById('report-attendance-end-date').value;
            
            try {
                const wb = XLSX.utils.table_to_book(table, {sheet: "Attendance"});
                XLSX.writeFile(wb, `Attendance_Report_${startDate}_to_${endDate}.xlsx`);
            } catch (error) {
                console.error(error);
                alert('Failed to export to Excel.');
            }
        });
    }

    let attendanceReportSortAsc = false;
    const sortReportAttendanceDate = document.getElementById('sort-report-attendance-date');
    if (sortReportAttendanceDate) {
        sortReportAttendanceDate.addEventListener('click', () => {
            const tbody = document.getElementById('attendance-report-tbody');
            if (!tbody || tbody.innerHTML.includes('Select a date') || tbody.innerHTML.includes('No attendance records found') || tbody.innerHTML.includes('fa-spinner')) return;
            
            attendanceReportSortAsc = !attendanceReportSortAsc;
            const icon = document.getElementById('sort-report-attendance-date-icon');
            if (icon) {
                icon.className = attendanceReportSortAsc ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
            
            const rows = Array.from(tbody.querySelectorAll('tr'));
            rows.sort((a, b) => {
                const dateA = new Date(a.cells[0].textContent.trim());
                const dateB = new Date(b.cells[0].textContent.trim());
                return attendanceReportSortAsc ? dateA - dateB : dateB - dateA;
            });
            
            tbody.innerHTML = '';
            rows.forEach(row => tbody.appendChild(row));
        });
    }

    // Validation Form Submit Handler
    const valForm = document.getElementById('warranty-validation-form');
    if (valForm) {
        valForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('btn-val-form-submit');
            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.spinner');
            
            const rowIndex = document.getElementById('val-form-row-index').value;
            if (!rowIndex) return;

            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            
            try {
                // We only send the 6 fields specifically for columns L to Q (12 to 17) to prevent overwriting anything else
                const validationData = [
                    document.getElementById('val-form-received-date').value || '',
                    document.getElementById('val-form-rma-office').value || '',
                    document.getElementById('val-form-status').value || '',
                    document.getElementById('val-form-assigned-tech').value || '',
                    document.getElementById('val-form-remarks').value || '',
                    document.getElementById('val-form-replacement-date').value || ''
                ];

                const formData = {
                    action: 'updateWarrantyValidation',
                    rowIndex: parseInt(rowIndex, 10),
                    validationData: validationData,
                    encodedBy: sessionStorage.getItem('loggedInUser') || 'Unknown'
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    // Update the global allValidationRecords array with new data
                    const recordIndex = allValidationRecords.findIndex(r => r[r.length - 1] == rowIndex);
                    if (recordIndex !== -1) {
                        allValidationRecords[recordIndex][11] = validationData[0];
                        allValidationRecords[recordIndex][12] = validationData[1];
                        allValidationRecords[recordIndex][13] = validationData[2];
                        allValidationRecords[recordIndex][14] = validationData[3];
                        allValidationRecords[recordIndex][15] = validationData[4];
                        allValidationRecords[recordIndex][16] = validationData[5];
                        allValidationRecords[recordIndex][9] = validationData[2]; // Update main Status column
                    }
                    
                    // Switch back to validation container and refresh table visually
                    hideAllContainers();
                    document.getElementById('warranty-validation-container').classList.remove('hidden');
                    
                    // Call the render function to update the view
                    if (typeof renderValidationTable === 'function') {
                        renderValidationTable();
                    }
                    
                    valForm.reset();
                    alert('Validation saved successfully!');
                } else {
                    alert("Error saving validation: " + result.message);
                }
            } catch (err) {
                console.error("Submit Validation Error:", err);
                alert("An error occurred while saving the validation data. Error Details: " + (err.message || err));
            } finally {
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }
});

// Make General Report Draggable
document.addEventListener("DOMContentLoaded", function() {
    const reportContent = document.getElementById("admin-report-content");
    const reportHeader = document.getElementById("admin-report-header");

    let isDragging = false;
    let offsetX, offsetY;

    if (reportHeader && reportContent) {
        reportHeader.addEventListener("mousedown", (e) => {
            isDragging = true;
            // Get initial mouse position relative to the element
            offsetX = e.clientX - reportContent.getBoundingClientRect().left;
            offsetY = e.clientY - reportContent.getBoundingClientRect().top;
            
            // Remove CSS transform centering so top/left work as absolute coordinates
            reportContent.style.transform = 'none';
            reportContent.style.left = e.clientX - offsetX + 'px';
            reportContent.style.top = e.clientY - offsetY + 'px';
            
            reportContent.style.cursor = 'grabbing';
            reportHeader.style.cursor = 'grabbing';
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            reportContent.style.left = newX + "px";
            reportContent.style.top = newY + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                reportContent.style.cursor = '';
                reportHeader.style.cursor = 'move';
            }
        });
    }
});

// Make Monthly Income Report Draggable
document.addEventListener("DOMContentLoaded", function() {
    const monthlyContent = document.getElementById("admin-monthly-income-content");
    const monthlyHeader = document.getElementById("admin-monthly-income-header");

    let isDragging = false;
    let offsetX, offsetY;

    if (monthlyHeader && monthlyContent) {
        monthlyHeader.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - monthlyContent.getBoundingClientRect().left;
            offsetY = e.clientY - monthlyContent.getBoundingClientRect().top;
            
            monthlyContent.style.transform = 'none';
            monthlyContent.style.left = e.clientX - offsetX + 'px';
            monthlyContent.style.top = e.clientY - offsetY + 'px';
            
            monthlyContent.style.cursor = 'grabbing';
            monthlyHeader.style.cursor = 'grabbing';
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            monthlyContent.style.left = newX + "px";
            monthlyContent.style.top = newY + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                monthlyContent.style.cursor = '';
                monthlyHeader.style.cursor = 'move';
            }
        });
    }
});
// Make MGH Survey Report Draggable
document.addEventListener("DOMContentLoaded", function() {
    const surveyContent = document.getElementById("admin-survey-report-content");
    const surveyHeader = document.getElementById("admin-survey-report-header");

    let isDragging = false;
    let offsetX, offsetY;

    if (surveyHeader && surveyContent) {
        surveyHeader.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - surveyContent.getBoundingClientRect().left;
            offsetY = e.clientY - surveyContent.getBoundingClientRect().top;
            
            surveyContent.style.transform = 'none';
            surveyContent.style.left = e.clientX - offsetX + 'px';
            surveyContent.style.top = e.clientY - offsetY + 'px';
            
            surveyContent.style.cursor = 'grabbing';
            surveyHeader.style.cursor = 'grabbing';
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            surveyContent.style.left = newX + "px";
            surveyContent.style.top = newY + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                surveyContent.style.cursor = '';
                surveyHeader.style.cursor = 'move';
            }
        });
    }
});


// Make Admin Attendance Report Draggable
document.addEventListener("DOMContentLoaded", function() {
    const attContent = document.getElementById("admin-attendance-report-content");
    const attHeader = document.getElementById("admin-attendance-report-header");

    let isDragging = false;
    let offsetX, offsetY;

    if (attHeader && attContent) {
        attHeader.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - attContent.getBoundingClientRect().left;
            offsetY = e.clientY - attContent.getBoundingClientRect().top;
            
            attContent.style.transform = 'none';
            attContent.style.left = e.clientX - offsetX + 'px';
            attContent.style.top = e.clientY - offsetY + 'px';
            
            attContent.style.cursor = 'grabbing';
            attHeader.style.cursor = 'grabbing';
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            attContent.style.left = newX + "px";
            attContent.style.top = newY + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                attContent.style.cursor = '';
                attHeader.style.cursor = 'move';
            }
        });
    }
});


// Make Warranty Validation Form Draggable
document.addEventListener("DOMContentLoaded", function() {
    const valFormContainer = document.getElementById("warranty-validation-form-container");
    const valFormHeader = document.getElementById("warranty-val-form-header");

    if (valFormContainer && valFormHeader) {
        let isDragging = false;
        let offsetX, offsetY;

        valFormHeader.addEventListener("mousedown", (e) => {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
            isDragging = true;
            offsetX = e.clientX - valFormContainer.getBoundingClientRect().left;
            offsetY = e.clientY - valFormContainer.getBoundingClientRect().top;
            valFormContainer.style.cursor = 'grabbing';
            valFormHeader.style.cursor = 'grabbing';
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            valFormContainer.style.left = newX + "px";
            valFormContainer.style.top = newY + "px";
            valFormContainer.style.transform = "none";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                valFormContainer.style.cursor = '';
                valFormHeader.style.cursor = 'move';
            }
        });
    }
    
    // Validation Form Submit Handler
    // (Moved to correct scope in main DOMContentLoaded block)
});
document.addEventListener("DOMContentLoaded", function() {
    const expensesContainer = document.getElementById("expenses-container");
    const expensesHeader = document.getElementById("expenses-header");

    let isDragging = false;
    let offsetX, offsetY;

    if (expensesHeader && expensesContainer) {
        expensesHeader.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - expensesContainer.getBoundingClientRect().left;
            offsetY = e.clientY - expensesContainer.getBoundingClientRect().top;
            
            expensesContainer.style.transform = 'none';
            expensesContainer.style.left = e.clientX - offsetX + 'px';
            expensesContainer.style.top = e.clientY - offsetY + 'px';
            
            expensesContainer.style.cursor = 'grabbing';
            expensesHeader.style.cursor = 'grabbing';
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            expensesContainer.style.left = newX + "px";
            expensesContainer.style.top = newY + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                expensesContainer.style.cursor = '';
                expensesHeader.style.cursor = 'move';
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const editModal = document.getElementById('edit-records-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const viewRecordsBtns = document.querySelectorAll('.view-records-btn');
    const filterForm = document.getElementById('filter-records-form');
    const sheetNameInput = document.getElementById('edit-sheet-name');
    const editTitle = document.getElementById('edit-records-title');
    const theadTr = document.getElementById('edit-records-thead-tr');
    const tbody = document.getElementById('edit-records-tbody');
    const startDateInput = document.getElementById('edit-start-date');
    const endDateInput = document.getElementById('edit-end-date');

    if (!editModal) return;

    const sheetColumns = {
        'Cash Expenses': ['Branch', 'Date', 'Item Description', 'Amount', 'Receipt'],
        'Gcash Expenses': ['Branch', 'Date', 'Details', 'Payment Method', 'Amount', 'Reference#', 'Receipt'],
        'Gcash Receivable': ['Branch', 'Date', 'Customer Name', 'No of Hours', 'Payment Method', 'Reference#', 'Amount'],
        'Cash on Hand': ['Branch', 'Date', 'Amount Per Shift'],
        'Remitted amount': ['Date', 'Bank Name', 'Amount', 'Screenshot URL', 'Login Account', 'Branch'],
        'Other Expenses': ['Start Date', 'End Date', 'Branch', 'Internet', 'Rent', 'Electricity', 'Water', 'Pondo', 'Food', 'Salary'],
        'Daily Survey': ['Date', 'Branch', 'Time', 'Count', 'Logged In'],
        'Warranty Items': ['Date', 'Branch', 'Tech', 'Item Description', 'Serial#', 'PC#', 'Qty', 'Issue and Concern', 'Sup Approver', 'Status', 'Warranty#'],
        'Handover': ['Date', 'Branch', 'Outgoing Staff', 'Handover Description', 'Discussion', 'Status', 'Incoming Staff', 'Remarks', 'Approver'],
        'MarvsPCStufz Expenses': ['Date', 'Category', 'Expenses Description', 'Amount', 'Account Name'],
        'Item Purchased': ['Date', 'Supplier Name', 'Item Category', 'Item Description', 'Serial Number', 'Status', 'Accountable Person'],
        'Daily Check and Balance': ['Date', 'Branch', 'Cash Expense', 'Gcash Expenses', 'Gcash Receivable', 'Cash on hand', 'Daily Sales', 'Pondo Amount', 'Discrepancy', 'Remarks', 'Login Account']
    };

    viewRecordsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sheet = btn.getAttribute('data-sheet');
            sheetNameInput.value = sheet;
            editTitle.textContent = "View & Edit: " + sheet;
            
            const editStatusContainer = document.getElementById('edit-status-container');
            const editStatusFilter = document.getElementById('edit-status-filter');
            if (editStatusContainer && editStatusFilter) {
                if (sheet === 'Handover') {
                    editStatusContainer.classList.remove('hidden');
                    editStatusFilter.innerHTML = '<option value="All">All Status</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option>';
                    editStatusFilter.value = 'All';
                } else if (sheet === 'Warranty Items') {
                    editStatusContainer.classList.remove('hidden');
                    editStatusFilter.innerHTML = '<option value="All">All Status</option><option value="Pending">Pending</option><option value="Sent to RMA">Sent to RMA</option><option value="Replaced">Replaced</option>';
                    editStatusFilter.value = 'All';
                } else if (sheet === 'Item Purchased') {
                    editStatusContainer.classList.remove('hidden');
                    editStatusFilter.innerHTML = '<option value="All">All Status</option><option value="Received">Received</option><option value="Returned">Returned</option><option value="Replaced">Replaced</option>';
                    editStatusFilter.value = 'All';
                } else {
                    editStatusContainer.classList.add('hidden');
                }
            }
            
            const editBranchContainer = document.getElementById('edit-branch-container');
            const editSupplierContainer = document.getElementById('edit-supplier-container');
            const editCategoryContainer = document.getElementById('edit-category-container');
            const editSerialContainer = document.getElementById('edit-serial-container');
            const editWarrantyNoContainer = document.getElementById('edit-warranty-no-container');
            const editCategoryFilter = document.getElementById('edit-category-filter');

            if (editBranchContainer) {
                if (sheet === 'MarvsPCStufz Expenses') {
                    editBranchContainer.classList.add('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.add('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.remove('hidden');
                    if (editSerialContainer) editSerialContainer.classList.add('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.add('hidden');
                    
                    if (editCategoryFilter) {
                        editCategoryFilter.innerHTML = '<option value="All">All Categories</option>';
                        const marvsCat = document.getElementById('marvspc-category');
                        if (marvsCat) {
                            Array.from(marvsCat.options).forEach(opt => {
                                if (opt.value && opt.value !== '') {
                                    const newOpt = document.createElement('option');
                                    newOpt.value = opt.value;
                                    newOpt.textContent = opt.textContent;
                                    editCategoryFilter.appendChild(newOpt);
                                }
                            });
                        }
                    }
                } else if (sheet === 'Item Purchased') {
                    editBranchContainer.classList.add('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.remove('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.remove('hidden');
                    if (editSerialContainer) editSerialContainer.classList.remove('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.add('hidden');
                    
                    if (editCategoryFilter) {
                        editCategoryFilter.innerHTML = '<option value="All">All Categories</option>';
                        const purCat = document.getElementById('purchased-category');
                        if (purCat) {
                            Array.from(purCat.options).forEach(opt => {
                                if (opt.value && opt.value !== '') {
                                    const newOpt = document.createElement('option');
                                    newOpt.value = opt.value;
                                    newOpt.textContent = opt.textContent;
                                    editCategoryFilter.appendChild(newOpt);
                                }
                            });
                        }
                    }
                } else if (sheet === 'Warranty Items') {
                    editBranchContainer.classList.remove('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.add('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.add('hidden');
                    if (editSerialContainer) editSerialContainer.classList.add('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.remove('hidden');
                } else {
                    editBranchContainer.classList.remove('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.add('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.add('hidden');
                    if (editSerialContainer) editSerialContainer.classList.add('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.add('hidden');
                }
            }
            
            // Set default dates to today
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;
            startDateInput.value = todayStr;
            endDateInput.value = todayStr;
            
            // Render headers
            theadTr.innerHTML = '';
            const cols = sheetColumns[sheet] || [];
            cols.forEach(col => {
                const th = document.createElement('th');
                th.style.padding = '8px';
                if (col.toLowerCase().includes('date')) {
                    if (window.editModalSortDesc === undefined) window.editModalSortDesc = true;
                    th.style.cursor = 'pointer';
                    th.innerHTML = `${col} <i class="fas fa-sort${window.editModalSortDesc ? '-down' : '-up'}"></i>`;
                    th.addEventListener('click', () => {
                        window.editModalSortDesc = !window.editModalSortDesc;
                        th.innerHTML = `${col} <i class="fas fa-sort${window.editModalSortDesc ? '-down' : '-up'}"></i>`;
                        applyEditModalFilters();
                    });
                } else {
                    th.textContent = col;
                }
                theadTr.appendChild(th);
            });
            if (sheet !== 'Daily Survey') {
                const actionTh = document.createElement('th');
                actionTh.style.padding = '8px';
                actionTh.textContent = 'Actions';
                theadTr.appendChild(actionTh);
            }
            
            tbody.innerHTML = '<tr><td colspan="10" style="padding: 15px; text-align: center; color: var(--text-muted);">Loading data...</td></tr>';
            editModal.classList.remove('hidden');
            
            // Auto-load records when modal opens
            filterForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
    });

    closeEditModalBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    filterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sheet = sheetNameInput.value;
        const submitBtn = filterForm.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner');
        
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        
        try {
            const formData = {
                action: 'getExpenseRecords',
                sheetName: sheet,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                branch: document.getElementById('edit-branch').value,
                supplier: document.getElementById('edit-supplier-filter') ? document.getElementById('edit-supplier-filter').value : 'All',
                category: document.getElementById('edit-category-filter') ? document.getElementById('edit-category-filter').value : 'All',
                status: document.getElementById('edit-status-filter') ? document.getElementById('edit-status-filter').value : 'All'
            };
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                window.currentEditRecords = result.data;
                applyEditModalFilters();
            } else {
                alert("Error loading records: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    window.renderSurveyReport = function() {
        if (!window.currentSurveyRecords) return;
        
        let displayData = [...window.currentSurveyRecords];
        
        if (window.surveySortDesc) {
            displayData.sort((a, b) => {
                const dateA = new Date(`${a[0]} ${a[2]}`).getTime() || new Date(a[0]).getTime() || 0;
                const dateB = new Date(`${b[0]} ${b[2]}`).getTime() || new Date(b[0]).getTime() || 0;
                return dateB - dateA; // descending
            });
            const icon = document.getElementById('sort-survey-date-icon');
            if(icon) icon.className = 'fas fa-sort-down';
        } else {
            displayData.sort((a, b) => {
                const dateA = new Date(`${a[0]} ${a[2]}`).getTime() || new Date(a[0]).getTime() || 0;
                const dateB = new Date(`${b[0]} ${b[2]}`).getTime() || new Date(b[0]).getTime() || 0;
                return dateA - dateB; // ascending
            });
            const icon = document.getElementById('sort-survey-date-icon');
            if(icon) icon.className = 'fas fa-sort-up';
        }

        const tbody = document.getElementById('survey-report-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const chartLabels = [];
        const chartData = [];

        displayData.forEach(row => {
            const [rowDate, rowBranch, rowTime, rowCount, rowLoggedin] = row;
            
            let formattedDate = rowDate;
            if (rowDate) {
                let dateStr = String(rowDate);
                if (dateStr.includes('T')) {
                    formattedDate = dateStr.split('T')[0];
                } else if (dateStr.includes(' ')) {
                    formattedDate = dateStr.split(' ')[0];
                }
            }
            
            let formattedTime = rowTime;
            if (rowTime) {
                let timeStr = String(rowTime);
                if (timeStr.includes('T')) {
                    timeStr = timeStr.split('T')[1];
                } else if (timeStr.includes(' ')) {
                    timeStr = timeStr.split(' ')[1];
                }
                if (timeStr && timeStr.includes(':')) {
                    let [h, m] = timeStr.split(':');
                    h = parseInt(h);
                    if (!isNaN(h)) {
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12;
                        h = h ? h : 12;
                        formattedTime = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                    }
                }
            }

            chartLabels.push(`${formattedDate} ${formattedTime}`);
            chartData.push(parseInt(rowCount) || 0);

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 12px;">${formattedDate}</td>
                <td style="padding: 12px;">${rowBranch || ''}</td>
                <td style="padding: 12px;">${formattedTime || ''}</td>
                <td style="padding: 12px;">${rowCount !== undefined ? rowCount : ''}</td>
                <td style="padding: 12px;">${rowLoggedin || ''}</td>
            `;
            tbody.appendChild(tr);
        });

        try {
            if (window.surveyChartInstance) {
                window.surveyChartInstance.destroy();
            } else if (typeof surveyChartInstance !== 'undefined' && surveyChartInstance) {
                surveyChartInstance.destroy();
            }
            
            const canvas = document.getElementById('surveyChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            window.surveyChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Survey Count',
                        data: chartData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderWidth: 2,
                        pointBackgroundColor: '#3b82f6',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                        },
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: 'rgba(255, 255, 255, 0.9)' } }
                    }
                }
            });
            
            // Also keep the local variable in sync if it exists in scope
            if (typeof surveyChartInstance !== 'undefined') {
                surveyChartInstance = window.surveyChartInstance;
            }
        } catch (chartErr) {
            console.error("Error generating chart:", chartErr);
        }
    }

    const sortSurveyDateBtn = document.getElementById('sort-survey-date');
    if (sortSurveyDateBtn) {
        sortSurveyDateBtn.addEventListener('click', () => {
            window.surveySortDesc = !window.surveySortDesc;
            window.renderSurveyReport();
        });
    }

    function applyEditModalFilters() {
        if (!window.currentEditRecords) return;
        const sheet = sheetNameInput.value;
        let filteredData = [...window.currentEditRecords];
        
        const selectedBranch = document.getElementById('edit-branch').value;
        if (selectedBranch && selectedBranch !== 'All') {
            const branchColIndex = (sheetColumns[sheet] || []).indexOf('Branch');
            if (branchColIndex !== -1) {
                filteredData = filteredData.filter(row => row[branchColIndex] === selectedBranch);
            }
        }
        
        if (sheet === 'Handover' || sheet === 'Warranty Items' || sheet === 'Item Purchased') {
            const selectedStatus = document.getElementById('edit-status-filter').value;
            if (selectedStatus && selectedStatus !== 'All') {
                const statusColIndex = (sheetColumns[sheet] || []).indexOf('Status');
                if (statusColIndex !== -1) {
                    filteredData = filteredData.filter(row => {
                        const val = (row[statusColIndex] || '').toString().trim().toLowerCase();
                        return val === selectedStatus.trim().toLowerCase();
                    });
                }
            }
        }
        
        if (sheet === 'Item Purchased') {
            const selectedSupplier = document.getElementById('edit-supplier-filter') ? document.getElementById('edit-supplier-filter').value : 'All';
            if (selectedSupplier && selectedSupplier !== 'All') {
                const supplierColIndex = (sheetColumns[sheet] || []).indexOf('Supplier Name');
                if (supplierColIndex !== -1) {
                    filteredData = filteredData.filter(row => row[supplierColIndex] === selectedSupplier);
                }
            }
            const selectedCategory = document.getElementById('edit-category-filter') ? document.getElementById('edit-category-filter').value : 'All';
            if (selectedCategory && selectedCategory !== 'All') {
                let categoryColIndex = (sheetColumns[sheet] || []).indexOf('Item Category');
                if (categoryColIndex === -1) {
                    categoryColIndex = (sheetColumns[sheet] || []).indexOf('Category');
                }
                if (categoryColIndex !== -1) {
                    filteredData = filteredData.filter(row => row[categoryColIndex] === selectedCategory);
                }
            }
            
            const serialFilter = document.getElementById('edit-serial-filter') ? document.getElementById('edit-serial-filter').value.trim().toLowerCase() : '';
            if (serialFilter) {
                const serialColIndex = (sheetColumns[sheet] || []).indexOf('Serial Number');
                if (serialColIndex !== -1) {
                    filteredData = filteredData.filter(row => {
                        const val = (row[serialColIndex] || '').toString().toLowerCase();
                        return val.includes(serialFilter);
                    });
                }
            }
        }
        
        if (sheet === 'Warranty Items') {
            const warrantyNoFilter = document.getElementById('edit-warranty-no-filter') ? document.getElementById('edit-warranty-no-filter').value.trim().toLowerCase() : '';
            if (warrantyNoFilter) {
                const warrantyNoColIndex = (sheetColumns[sheet] || []).indexOf('Warranty#');
                if (warrantyNoColIndex !== -1) {
                    filteredData = filteredData.filter(row => {
                        const val = (row[warrantyNoColIndex] || '').toString().toLowerCase();
                        return val.includes(warrantyNoFilter);
                    });
                }
            }
        }

        const dateColIndex = (sheetColumns[sheet] || []).findIndex(col => col.toLowerCase().includes('date'));
        if (dateColIndex !== -1 && window.editModalSortDesc !== undefined) {
            filteredData.sort((a, b) => {
                const dateA = new Date(a[dateColIndex] || 0);
                const dateB = new Date(b[dateColIndex] || 0);
                return window.editModalSortDesc ? dateB - dateA : dateA - dateB;
            });
        }
        
        renderRecords(filteredData, sheet);
    }

    const editBranchSelect = document.getElementById('edit-branch');
    if (editBranchSelect) {
        editBranchSelect.addEventListener('change', applyEditModalFilters);
    }
    
    const editStatusSelect = document.getElementById('edit-status-filter');
    if (editStatusSelect) {
        editStatusSelect.addEventListener('change', applyEditModalFilters);
    }
    
    const editSupplierSelect = document.getElementById('edit-supplier-filter');
    if (editSupplierSelect) {
        editSupplierSelect.addEventListener('change', applyEditModalFilters);
    }
    
    const editCategorySelect = document.getElementById('edit-category-filter');
    if (editCategorySelect) {
        editCategorySelect.addEventListener('change', applyEditModalFilters);
    }
    
    const editSerialInput = document.getElementById('edit-serial-filter');
    if (editSerialInput) {
        editSerialInput.addEventListener('input', applyEditModalFilters);
    }
    
    const editWarrantyNoInput = document.getElementById('edit-warranty-no-filter');
    if (editWarrantyNoInput) {
        editWarrantyNoInput.addEventListener('input', applyEditModalFilters);
    }


    const btnPrintEditReport = document.getElementById('btn-print-edit-report');
    if (btnPrintEditReport) {
        btnPrintEditReport.addEventListener('click', () => {
            const startDate = document.getElementById('edit-start-date').value;
            const endDate = document.getElementById('edit-end-date').value;
            const branch = document.getElementById('edit-branch').value;
            const sheet = document.getElementById('edit-sheet-name').value;
            
            if (!startDate || !endDate) {
                alert("Please load records first.");
                return;
            }

            const tbody = document.getElementById('edit-records-tbody');
            if (!tbody || tbody.innerHTML.includes('No records found') || tbody.innerHTML.includes('Select a date range')) {
                alert("No records to print.");
                return;
            }

            const btnText = btnPrintEditReport.querySelector('.btn-text');
            const originalText = btnText.innerHTML;
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btnPrintEditReport.disabled = true;

            const newTab = window.open('', '_blank');
            if (newTab) {
                newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating PDF Report, please wait...</h3>');
            } else {
                alert('Popup blocked! Please allow popups for this site to view the PDF.');
            }

            try {
                // Clone the table to manipulate for print
                const tableClone = document.getElementById('edit-records-table').cloneNode(true);
                let columnsToRemove = [];

                // Process thead
                const theadTr = tableClone.querySelector('thead tr');
                if (theadTr) {
                    theadTr.style.background = '#f1f5f9';
                    theadTr.style.borderBottom = '2px solid #cbd5e1';
                    Array.from(theadTr.cells).forEach((cell, index) => {
                        cell.style.color = '#334155';
                        cell.style.textAlign = 'left';
                        
                        const headerText = cell.textContent.trim();
                        if (headerText === 'Date' || headerText === 'Recorded Date' || headerText === 'Branch' || headerText === 'Status' || headerText === 'Incoming Staff' || headerText === 'Approver' || headerText === 'Tech' || headerText === 'Serial Number') {
                            cell.style.whiteSpace = 'nowrap';
                        } else {
                            cell.style.whiteSpace = 'normal';
                            cell.style.wordWrap = 'break-word';
                        }
                        
                        // Mark 'Actions', 'Outgoing Staff', and 'Discussion' for removal
                        if (headerText === 'Actions' || 
                           (sheet === 'Handover' && (headerText === 'Outgoing Staff' || headerText === 'Discussion')) ||
                           (sheet === 'Warranty Items' && headerText === 'Serial#')) {
                            columnsToRemove.push(index);
                        }
                    });
                    
                    // Remove marked columns from thead (reverse order to preserve indices)
                    columnsToRemove.sort((a, b) => b - a).forEach(index => {
                        theadTr.deleteCell(index);
                    });
                }
                
                // Process tbody
                const tbodyClone = tableClone.querySelector('tbody');
                if (tbodyClone) {
                    Array.from(tbodyClone.rows).forEach(row => {
                        row.style.borderBottom = '1px solid #cbd5e1';
                        row.style.pageBreakInside = 'avoid';
                        
                        // Remove marked columns from tbody
                        columnsToRemove.sort((a, b) => b - a).forEach(index => {
                            if (row.cells[index]) {
                                row.deleteCell(index);
                            }
                        });
                        
                        Array.from(row.cells).forEach((cell, index) => {
                            cell.style.color = '#334155';
                            cell.style.textAlign = 'left';
                            
                            let headerText = '';
                            if (theadTr && theadTr.cells[index]) {
                                headerText = theadTr.cells[index].textContent.trim();
                            }
                            
                            if (headerText === 'Date' || headerText === 'Recorded Date' || headerText === 'Branch' || headerText === 'Status' || headerText === 'Incoming Staff' || headerText === 'Approver' || headerText === 'Tech' || headerText === 'Serial Number') {
                                cell.style.whiteSpace = 'nowrap';
                            } else {
                                cell.style.whiteSpace = 'normal';
                                cell.style.wordWrap = 'break-word';
                            }
                            // Replace input fields with their values
                            const input = cell.querySelector('input, select, textarea, div[class^="edit-input-"]');
                            if (input) {
                                cell.textContent = input.value !== undefined ? input.value : input.innerText;
                            }
                        });
                    });
                }

                const htmlString = `
                    <div style="font-family: sans-serif; color: #333; padding: 20px; background: white; max-width: 1000px; margin: 0 auto;">
                        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
                            <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 24px;">${sheet} Report</h2>
                            <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Branch:</strong> ${branch === 'All' ? 'All Branches' : branch}</p>
                            <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Period:</strong> ${startDate} to ${endDate}</p>
                        </div>
                        
                        <div style="width: 100%;">
                            <table style="width: 100%; table-layout: auto; word-wrap: break-word; border-collapse: collapse; font-size: 11px; text-align: left; margin-top: 20px;">
                                ${tableClone.innerHTML}
                            </table>
                        </div>
                        <div style="margin-top: 30px; text-align: right; font-size: 11px; color: #94a3b8;">
                            <p>Generated on ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                `;

                const hiddenDiv = document.createElement('div');
                hiddenDiv.innerHTML = htmlString;
                hiddenDiv.style.position = 'absolute';
                hiddenDiv.style.top = '-9999px';
                hiddenDiv.style.left = '-9999px';
                hiddenDiv.style.width = '1000px';
                document.body.appendChild(hiddenDiv);

                const opt = {
                    margin:       0.5,
                    filename:     `${sheet.replace(/\s+/g, '_')}_Report_${startDate}_to_${endDate}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' },
                    pagebreak:    { mode: ['css', 'legacy'], avoid: 'tr' }
                };

                const elementToPrint = hiddenDiv.firstElementChild;

                html2pdf().set(opt).from(elementToPrint).output('bloburl').then(function(pdfUrl) {
                    if (newTab) {
                        newTab.location.href = pdfUrl;
                    }
                    document.body.removeChild(hiddenDiv);
                    btnText.innerHTML = originalText;
                    btnPrintEditReport.disabled = false;
                }).catch(err => {
                    console.error("PDF generation error:", err);
                    alert("Failed to generate PDF.");
                    if(newTab) newTab.close();
                    btnText.innerHTML = originalText;
                    btnPrintEditReport.disabled = false;
                });
                
            } catch (error) {
                console.error(error);
                alert("Error generating report: " + error.message);
                if(newTab) newTab.close();
                btnText.innerHTML = originalText;
                btnPrintEditReport.disabled = false;
            }
        });
    }

    function renderRecords(rows, sheet) {
        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found for this date range.</td></tr>';
            return;
        }
        
        const colsCount = (sheetColumns[sheet] || []).length;
        
        rows.forEach(row => {
            const rowIndex = row[row.length - 1]; // The last element is the row index
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            // Render cells
            for(let i = 0; i < colsCount; i++) {
                const td = document.createElement('td');
                td.style.padding = '8px';
                td.style.whiteSpace = 'nowrap';
                
                let val = row[i];
                if (val === undefined || val === null) val = '';
                
                const colName = sheetColumns[sheet][i] || '';
                
                // format date string if it's a date cell
                let isDateCol = false;
                if (sheet === 'Remitted amount' || sheet === 'Daily Survey' || sheet === 'Warranty Items' || sheet === 'Handover' || sheet === 'Item Purchased') {
                    isDateCol = (i === 0);
                } else if (sheet === 'Other Expenses') {
                    isDateCol = (i === 0 || i === 1);
                } else {
                    isDateCol = (i === 1);
                }
                if (isDateCol && val && String(val).includes('T')) {
                    val = String(val).split('T')[0];
                }
                
                // format time string if it's a time cell
                if (colName.toLowerCase() === 'time' && val) {
                    let h, m;
                    const valStr = String(val);
                    if (valStr.includes('T')) {
                        const d = new Date(valStr);
                        if (!isNaN(d.getTime())) {
                            h = d.getHours();
                            m = String(d.getMinutes()).padStart(2, '0');
                        }
                    } else if (valStr.includes(':')) {
                        const timePart = valStr.includes(' ') ? valStr.split(' ')[1] : valStr;
                        const parts = timePart.split(':');
                        h = parseInt(parts[0], 10);
                        m = parts[1].padStart(2, '0');
                    }
                    
                    if (h !== undefined && m !== undefined) {
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12;
                        h = h ? h : 12;
                        val = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                    }
                }
                
                // format amount with commas
                if (colName.toLowerCase().includes('amount') && val !== '' && !isNaN(String(val).replace(/,/g, ''))) {
                    // Just in case it already has commas, remove them first
                    const cleanVal = String(val).replace(/,/g, '');
                    val = parseFloat(cleanVal).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
                
                const inputEl = document.createElement('div');
                inputEl.innerText = val;
                inputEl.className = `edit-input-${rowIndex}`;
                inputEl.style.cssText = 'background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 4px 6px; color: inherit; width: 100%; min-width: 150px; outline: none; font-family: inherit; font-size: 0.95em; box-sizing: border-box; word-break: break-word; white-space: pre-wrap;';
                
                td.appendChild(inputEl);
                tr.appendChild(td);
            }
            
            // Action cell
            const actionTd = document.createElement('td');
            actionTd.style.padding = '8px';
            actionTd.style.whiteSpace = 'nowrap';
            
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editBtn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-right: 5px;';
            
            const saveBtn = document.createElement('button');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.style.cssText = 'background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; display: none;';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.style.cssText = 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-right: 5px;';
            
            deleteBtn.addEventListener('click', async () => {
                const rowIndex = row[row.length - 1];
                showConfirm(
                    'Delete Record',
                    'Are you sure you want to delete this record? This cannot be undone.',
                    async () => {
                        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        deleteBtn.disabled = true;
                        try {
                            const response = await fetch(SCRIPT_URL, {
                                method: 'POST',
                                body: new URLSearchParams({
                                    action: 'deleteRecord',
                                    sheetName: sheet,
                                    rowIndex: rowIndex,
                                    encodedBy: sessionStorage.getItem('loggedInUser')
                                })
                            });
                            const result = await response.json();
                            if (result.status === 'success') {
                                showToast('Record deleted successfully.', 'success');
                                document.getElementById('filter-records-form').dispatchEvent(new Event('submit'));
                            } else {
                                showToast('Error: ' + result.message, 'error');
                                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
                                deleteBtn.disabled = false;
                            }
                        } catch (error) {
                            showToast('Error: ' + error.message, 'error');
                            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
                            deleteBtn.disabled = false;
                        }
                    }
                );
            });
            
            editBtn.addEventListener('click', () => {
                const inputs = tr.querySelectorAll(`.edit-input-${rowIndex}`);
                inputs.forEach(input => {
                    input.contentEditable = true;
                    input.style.background = 'rgba(0,0,0,0.3)';
                    input.style.border = '1px solid rgba(255,255,255,0.2)';
                    input.style.padding = '6px';
                    input.style.borderRadius = '4px';
                });
                editBtn.style.display = 'none';
                saveBtn.style.display = 'inline-block';
            });
            
            saveBtn.addEventListener('click', async () => {
                const inputs = tr.querySelectorAll(`.edit-input-${rowIndex}`);
                const updatedData = [];
                inputs.forEach((input, index) => {
                    let valToSave = input.value !== undefined ? input.value : input.innerText;
                    const colName = sheetColumns[sheet][index] || '';
                    if (colName.toLowerCase().includes('amount')) {
                        // strip commas before saving back to server
                        valToSave = valToSave.replace(/,/g, '');
                    }
                    updatedData.push(valToSave);
                });
                
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                saveBtn.disabled = true;
                
                try {
                    const formData = {
                        action: 'updateExpenseRecord',
                        sheetName: sheet,
                        rowIndex: rowIndex,
                        updatedData: updatedData,
                        encodedBy: sessionStorage.getItem('loggedInUser')
                    };
                    
                    const response = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(formData)
                    });
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        // Update local array for real-time refresh
                        if (window.currentEditRecords) {
                            const recIndex = window.currentEditRecords.findIndex(r => r[r.length - 1] === rowIndex);
                            if (recIndex !== -1) {
                                for(let i = 0; i < updatedData.length; i++) {
                                    window.currentEditRecords[recIndex][i] = updatedData[i];
                                }
                            }
                        }
                        showToast('Record updated successfully.', 'success');
                        applyEditModalFilters();
                    } else {
                        alert("Error saving: " + result.message);
                        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                    }
                } catch(err) {
                    console.error(err);
                    alert("Error: " + err.message);
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                } finally {
                    saveBtn.disabled = false;
                }
            });
            
            let viewBtn = null;
            let urlToView = null;
            for(let i = 0; i < colsCount; i++) {
                if (typeof row[i] === 'string' && row[i].startsWith('http')) {
                    urlToView = row[i];
                    break;
                }
            }
            if (urlToView) {
                viewBtn = document.createElement('a');
                viewBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> View';
                viewBtn.href = urlToView;
                viewBtn.target = '_blank';
                viewBtn.style.cssText = 'background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-right: 5px; text-decoration: none; display: inline-block;';
            }
            
            if (sheet !== 'Daily Survey') {
                if (viewBtn) actionTd.appendChild(viewBtn);
                if (sheet !== 'Warranty Items' && sheet !== 'Handover') {
                    if (sheet !== 'Item Purchased') {
                        actionTd.appendChild(deleteBtn);
                    }
                    actionTd.appendChild(editBtn);
                    actionTd.appendChild(saveBtn);
                } else if (sheet === 'Warranty Items') {
                    const currentRole = sessionStorage.getItem('userRole');
                    if (currentRole === 'Supervisor' || currentRole === 'Manager' || currentRole === 'Owner') {
                        const modifyBtn = document.createElement('button');
                        modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modify/Edit';
                        modifyBtn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;';
                        modifyBtn.addEventListener('click', () => {
                            try {
                                document.getElementById('edit-records-modal').classList.add('hidden');
                                document.getElementById('warranty-container').classList.remove('hidden');
                                
                                document.getElementById('warranty-row-index').value = rowIndex;
                                document.getElementById('warranty-date').value = (row[0] || '').split('T')[0];
                                document.getElementById('warranty-branch').value = row[1] || '';
                                
                                setTimeout(() => {
                                    document.getElementById('warranty-tech').value = row[2] || '';
                                }, 500);
                                
                                document.getElementById('warranty-item').value = row[3] || '';
                                document.getElementById('warranty-serial').value = row[4] || '';
                                document.getElementById('warranty-pc').value = row[5] || '';
                                document.getElementById('warranty-qty').value = row[6] || '';
                                document.getElementById('warranty-issue').value = row[7] || '';
                                document.getElementById('warranty-approver').value = sessionStorage.getItem('loggedInUser') || '';
                                document.getElementById('warranty-number').value = row[10] || '';
                                
                                const statusSelect = document.getElementById('warranty-status');
                                if (statusSelect) {
                                    statusSelect.disabled = false;
                                    statusSelect.value = row[9] || 'Pending';
                                }
                            } catch(err) {
                                alert("Error populating form: " + err.message);
                            }
                        });
                        actionTd.appendChild(modifyBtn);
                    }
                } else if (sheet === 'Handover') {
                    const currentRole = sessionStorage.getItem('userRole');
                    const modifyBtn = document.createElement('button');
                    modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modify/Edit';
                    modifyBtn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;';
                    modifyBtn.addEventListener('click', () => {
                        try {
                            document.getElementById('edit-records-modal').classList.add('hidden');
                            document.getElementById('handover-container').classList.remove('hidden');
                            
                            document.getElementById('handover-row-index').value = rowIndex;
                            document.getElementById('handover-date').value = (row[0] || '').split('T')[0];
                            document.getElementById('handover-branch').value = row[1] || '';
                            
                            setTimeout(() => {
                                document.getElementById('handover-outgoing-staff').value = row[2] || '';
                                document.getElementById('handover-incoming-staff').value = row[6] || '';
                            }, 500);
                            
                            document.getElementById('handover-description').value = row[3] || '';
                            document.getElementById('handover-discussion').value = row[4] || '';
                            document.getElementById('handover-remarks').value = row[7] || '';
                            document.getElementById('handover-approver').value = sessionStorage.getItem('loggedInUser') || '';
                            
                            const statusSelect = document.getElementById('handover-status');
                            if (statusSelect) {
                                if (currentRole === 'Supervisor' || currentRole === 'Manager' || currentRole === 'Owner') {
                                    statusSelect.disabled = false;
                                } else {
                                    statusSelect.disabled = true;
                                }
                                statusSelect.value = row[5] || 'In Progress';
                            }
                        } catch(err) {
                            alert("Error populating form: " + err.message);
                        }
                    });
                    actionTd.appendChild(modifyBtn);
                }
                
                // --- ROW LEVEL PRINT BUTTON ---
                const printRowBtn = document.createElement('button');
                printRowBtn.innerHTML = '<i class="fas fa-print"></i> Print';
                printRowBtn.style.cssText = 'background: rgba(255, 255, 255, 0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-left: 5px; margin-top: 5px;';
                printRowBtn.addEventListener('click', () => {
                    const originalText = printRowBtn.innerHTML;
                    printRowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    printRowBtn.disabled = true;

                    const newTab = window.open('', '_blank');
                    if (newTab) {
                        newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating Single Record PDF...</h3>');
                    } else {
                        alert('Popup blocked!');
                    }

                    try {
                        let htmlRows = '';
                        for(let i=0; i<colsCount; i++) {
                            const colName = sheetColumns[sheet][i] || '';
                            let colVal = row[i];
                            if (colVal === undefined || colVal === null) colVal = '';
                            
                            const inputs = tr.querySelectorAll(`.edit-input-${rowIndex}`);
                            if(inputs && inputs[i]) colVal = inputs[i].value !== undefined ? inputs[i].value : inputs[i].innerText;

                            htmlRows += `
                                <tr style="border-bottom: 1px solid #cbd5e1;">
                                    <th style="padding: 10px; background: #f8fafc; color: #475569; width: 35%; text-align: right; vertical-align: top;">${colName}</th>
                                    <td style="padding: 10px; color: #0f172a; white-space: pre-wrap; word-wrap: break-word;">${colVal}</td>
                                </tr>
                            `;
                        }

                        const htmlString = `
                            <div style="font-family: sans-serif; color: #333; padding: 30px; background: white; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
                                    <h2 style="margin: 0 0 5px 0; color: #1e293b; font-size: 22px;">${sheet} Details</h2>
                                    <p style="margin: 0; color: #64748b; font-size: 12px;">Printed on ${new Date().toLocaleString()}</p>
                                </div>
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed; word-wrap: break-word;">
                                    <tbody>
                                        ${htmlRows}
                                    </tbody>
                                </table>
                            </div>
                        `;

                        const hiddenDiv = document.createElement('div');
                        hiddenDiv.innerHTML = htmlString;
                        hiddenDiv.style.position = 'absolute';
                        hiddenDiv.style.top = '-9999px';
                        hiddenDiv.style.left = '-9999px';
                        hiddenDiv.style.width = '800px';
                        document.body.appendChild(hiddenDiv);

                        const opt = {
                            margin:       0.5,
                            filename:     `${sheet.replace(/\\s+/g, '_')}_Record.pdf`,
                            image:        { type: 'jpeg', quality: 0.98 },
                            html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                        };

                        html2pdf().set(opt).from(hiddenDiv.firstElementChild).output('bloburl').then(function(pdfUrl) {
                            if (newTab) newTab.location.href = pdfUrl;
                            document.body.removeChild(hiddenDiv);
                            printRowBtn.innerHTML = originalText;
                            printRowBtn.disabled = false;
                        }).catch(err => {
                            console.error(err);
                            if(newTab) newTab.close();
                            printRowBtn.innerHTML = originalText;
                            printRowBtn.disabled = false;
                        });
                    } catch(err) {
                        console.error(err);
                        if(newTab) newTab.close();
                        printRowBtn.innerHTML = originalText;
                        printRowBtn.disabled = false;
                    }
                });
                actionTd.appendChild(printRowBtn);
                // -----------------------------

                tr.appendChild(actionTd);
            }
            tbody.appendChild(tr);
        });
    }

    // Supplier Price List Logic
    const menuSupplierBtn = document.getElementById('menu-supplier-btn');
    const supplierListContainer = document.getElementById('supplier-list-container');
    
    if (menuSupplierBtn) {
        menuSupplierBtn.addEventListener('click', () => {
            window.hideAllContainers();
            if (supplierListContainer) supplierListContainer.classList.remove('hidden');
        });
    }

    const supplierFileUpload = document.getElementById('supplier-file-upload');
    const supplierFileName = document.getElementById('supplier-file-name');
    const supplierMappingSection = document.getElementById('supplier-mapping-section');
    const mapSheetName = document.getElementById('map-sheet-name');
    const mapSupplierName = document.getElementById('map-supplier-name');
    const mapItemName = document.getElementById('map-item-name');
    const mapItemCost = document.getElementById('map-item-cost');
    const mapIsBundle = document.getElementById('map-is-bundle');
    const btnApplyMapping = document.getElementById('btn-apply-mapping');
    const supplierSearch = document.getElementById('supplier-search');
    const supplierTableBody = document.getElementById('supplier-table-body');
    const supplierRecordCount = document.getElementById('supplier-record-count');
    const supplierSaveBtn = document.getElementById('supplier-save-btn');

    let currentWorkbook = null;
    let rawExcelData = [];
    let parsedSupplierItems = [];

    if (supplierFileUpload) {
        supplierFileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            supplierFileName.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                try {
                    currentWorkbook = window.XLSX.read(data, {type: 'array'});
                    if (!currentWorkbook || !currentWorkbook.SheetNames || currentWorkbook.SheetNames.length === 0) {
                        throw new Error('No sheets found in workbook');
                    }
                    
                    mapSheetName.innerHTML = '';
                    currentWorkbook.SheetNames.forEach((sheetName, index) => {
                        mapSheetName.innerHTML += `<option value="${index}">${sheetName}</option>`;
                    });

                    mapSupplierName.value = file.name.replace(/\.[^/.]+$/, '');
                    
                    parseSelectedSheet(0);
                    supplierMappingSection.classList.remove('hidden');

                } catch (err) {
                    console.error('Error parsing Excel:', err);
                    supplierTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 40px;">Error parsing file. Please make sure it is a valid Excel/CSV file.</td></tr>`;
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    if (mapSheetName) {
        mapSheetName.addEventListener('change', (e) => {
            parseSelectedSheet(parseInt(e.target.value));
        });
    }

    function parseSelectedSheet(sheetIndex) {
        if (!currentWorkbook) return;
        try {
            const sheetName = currentWorkbook.SheetNames[sheetIndex];
            const worksheet = currentWorkbook.Sheets[sheetName];
            const json = window.XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            rawExcelData = json.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== ''));
            if (rawExcelData.length === 0) {
                supplierTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 40px;">No data found in the selected sheet.</td></tr>`;
                return;
            }

            let headerRow = [];
            for(let i=0; i<rawExcelData.length; i++) {
                if (rawExcelData[i].length > 1) {
                    headerRow = rawExcelData[i];
                    break;
                }
            }

            mapItemName.innerHTML = '';
            mapItemCost.innerHTML = '';
            headerRow.forEach((col, index) => {
                const colName = col ? col.toString().trim() : `Column ${index + 1}`;
                mapItemName.innerHTML += `<option value="${index}">${colName}</option>`;
                mapItemCost.innerHTML += `<option value="${index}">${colName}</option>`;
            });

            let itemNameSet = false;
            let itemCostSet = false;
            for (let i = 0; i < headerRow.length; i++) {
                const h = (headerRow[i] || '').toString().toLowerCase().trim();
                if (!itemNameSet && (h === 'model' || h === 'item name' || h.includes('item') || h.includes('desc') || h.includes('name'))) {
                    mapItemName.value = i;
                    itemNameSet = true;
                }
                if (!itemCostSet && (h === 'price' || h === 'cost' || h === 'unit price' || h.includes('cost') || h.includes('price') || h.includes('amount') || h.includes('unit'))) {
                    mapItemCost.value = i;
                    itemCostSet = true;
                }
            }

            btnApplyMapping.click();

        } catch (error) {
            console.error('Sheet parse error:', error);
        }
    }

    if (btnApplyMapping) {
        btnApplyMapping.addEventListener('click', () => {
            const itemIdx = parseInt(mapItemName.value);
            const costIdx = parseInt(mapItemCost.value);
            const suppName = mapSupplierName.value.trim() || 'Unknown Supplier';
            const isBundle = mapIsBundle ? mapIsBundle.checked : true;

            if (isNaN(itemIdx) || isNaN(costIdx)) {
                alert('Please select columns for Item Name and Cost Price.');
                return;
            }

            parsedSupplierItems = [];
            const today = new Date().toISOString().split('T')[0];
            let currentGroup = '';
            let lastRowWasHeader = false;

            rawExcelData.forEach((row) => {
                const itemName = row[itemIdx] ? row[itemIdx].toString().trim() : '';
                let costStr = row[costIdx] ? row[costIdx].toString().replace(/,/g, '').replace(/[^\d.-]/g, '') : '';
                const cost = parseFloat(costStr);

                if (!itemName) return; 

                if (itemName.toLowerCase() === 'model' || itemName.toLowerCase() === 'item name' || itemName.toLowerCase() === 'description' || itemName.toLowerCase() === 'item description') {
                    lastRowWasHeader = true; // Mark that we just saw a header
                } else {
                    const lowerItem = itemName.toLowerCase();
                    const isMoboBrand = ['asus', 'asrock', 'msi', 'gigabyte', 'giga', 'biostar', 'ecs', 'colorful'].some(b => lowerItem.includes(b));
                    const hasPrice = !isNaN(cost) && cost > 0 && costStr !== '';
                    
                    if (isBundle) {
                        // If it's NOT a motherboard brand, it must be a Processor/Bundle Category
                        if (lastRowWasHeader || !isMoboBrand) {
                            currentGroup = itemName;
                        } else {
                            // It is a Motherboard
                            parsedSupplierItems.push({
                                itemName: itemName, 
                                category: currentGroup ? currentGroup : 'N/A',
                                supplier: suppName,
                                cost: hasPrice ? cost : 0,
                                lastUpdated: today
                            });
                        }
                    } else {
                        // Not bundle mode. Push everything.
                        parsedSupplierItems.push({
                            itemName: itemName, 
                            category: 'N/A',
                            supplier: suppName,
                            cost: hasPrice ? cost : 0,
                            lastUpdated: today
                        });
                    }
                    lastRowWasHeader = false;
                }
            });

            // parsedSupplierItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
            
            const supplierCategoryFilter = document.getElementById('supplier-category-filter');
            if (supplierCategoryFilter) {
                const uniqueCategories = [...new Set(parsedSupplierItems.map(item => item.category))].filter(c => c && c !== 'N/A');
                supplierCategoryFilter.innerHTML = '<option value="">All Categories</option>' + uniqueCategories.map(c => '<option value="' + c + '">' + c + '</option>').join('');
            }
            
            renderSupplierTable(parsedSupplierItems);
            
            if (parsedSupplierItems.length > 0) {
                supplierSaveBtn.disabled = false;
            }
        });
    }

    function renderSupplierTable(items) {
        supplierTableBody.innerHTML = '';
        if (supplierRecordCount) supplierRecordCount.textContent = items.length;

        if (items.length === 0) {
            supplierTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;">No valid items found based on the mapping.</td></tr>`;
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.cssText = `border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s;`;
            
            const costFormatted = item.cost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            tr.innerHTML = `
                <td style="padding: 10px 12px; color: #e2e8f0; font-weight: 500;">${item.itemName}</td>
                <td style="padding: 10px 12px; color: #fbbf24; font-size: 0.85em; font-weight: 600;">${item.category}</td>
                <td style="padding: 10px 12px; color: #94a3b8;">${item.supplier}</td>
                <td style="padding: 10px 12px; text-align: right; color: #10b981; font-weight: 600; font-family: monospace;">₱${costFormatted}</td>
                <td style="padding: 10px 12px; color: #cbd5e1; font-size: 0.85em;">${item.lastUpdated}</td>
                <td style="padding: 10px 12px; text-align: center;"><button class="submit-btn" style="margin:0; padding:4px 8px; font-size:0.75em; width:auto; background:rgba(239, 68, 68, 0.15); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.4);" onclick="this.closest('tr').remove(); updateSupplierCount();"><i class="fas fa-trash"></i></button></td>
            `;
            supplierTableBody.appendChild(tr);
        });
    }

    const supplierCategoryFilter = document.getElementById('supplier-category-filter');
    
    function applySupplierFilters() {
        if (!parsedSupplierItems) return;
        let filtered = parsedSupplierItems;
        
        if (supplierCategoryFilter && supplierCategoryFilter.value) {
            filtered = filtered.filter(item => item.category === supplierCategoryFilter.value);
        }
        
        if (supplierSearch && supplierSearch.value) {
            const term = supplierSearch.value.toLowerCase();
            filtered = filtered.filter(item => 
                (item.itemName && item.itemName.toLowerCase().includes(term)) || 
                (item.category && item.category.toLowerCase().includes(term))
            );
        }
        
        renderSupplierTable(filtered);
    }

    if (supplierCategoryFilter) {
        supplierCategoryFilter.addEventListener('change', applySupplierFilters);
    }
    
    if (supplierSearch) {
        supplierSearch.addEventListener('keyup', applySupplierFilters);
    }

    window.updateSupplierCount = function() {
        if (supplierTableBody && supplierRecordCount) {
            supplierRecordCount.textContent = supplierTableBody.querySelectorAll('tr').length;
        }
    };

    if (supplierSaveBtn) {
        supplierSaveBtn.addEventListener('click', async () => {
            if (parsedSupplierItems.length === 0) return;

            supplierSaveBtn.disabled = true;
            supplierSaveBtn.innerHTML = `<div class="spinner" style="display:inline-block; border-color:white; border-right-color:transparent; margin-right:5px; width:12px; height:12px; border-width:2px;"></div> Saving...`;

            try {
                const formData = {
                    action: 'saveSupplierPrices',
                    items: parsedSupplierItems,
                    encodedBy: sessionStorage.getItem('loggedInUser') || 'Unknown'
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    supplierSaveBtn.innerHTML = `<i class="fas fa-check"></i> Saved!`;
                    supplierSaveBtn.style.background = 'rgba(16, 185, 129, 0.4)';
                    setTimeout(() => {
                        supplierSaveBtn.innerHTML = `<i class="fas fa-save"></i> Save to Database`;
                        supplierSaveBtn.style.background = 'rgba(16, 185, 129, 0.15)';
                    }, 2000);
                } else {
                    alert('Error saving to database: ' + result.message);
                    supplierSaveBtn.innerHTML = `<i class="fas fa-save"></i> Save to Database`;
                    supplierSaveBtn.disabled = false;
                }
            } catch (err) {
                console.error("Save error:", err);
                alert("Network error. Could not save to database.");
                supplierSaveBtn.innerHTML = `<i class="fas fa-save"></i> Save to Database`;
                supplierSaveBtn.disabled = false;
            }
        });
    }

}); // end of DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {

    // --- Item Replacement Logic ---
    const btnLoadReplacements = document.getElementById('btn-load-replacements');
    const replSearchWarranty = document.getElementById('repl-search-warranty');
    const replStartDate = document.getElementById('repl-start-date');
    const replEndDate = document.getElementById('repl-end-date');
    const replTableBody = document.querySelector('#item-replacement-table tbody');

    let currentReplRecords = [];

    if (btnLoadReplacements) {
        btnLoadReplacements.addEventListener('click', async () => {
            if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
                alert('Please set your Google Apps Script URL in app.js');
                return;
            }

            const btnText = btnLoadReplacements.querySelector('.btn-text');
            const spinner = btnLoadReplacements.querySelector('.spinner');
            btnLoadReplacements.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            const start = replStartDate.value;
            const end = replEndDate.value;
            const searchVal = replSearchWarranty.value.trim().toLowerCase();

            replTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Loading records...</td></tr>';

            try {
                const formData = {
                    action: 'getExpenseRecords',
                    sheetName: 'Warranty Items',
                    startDate: start,
                    endDate: end,
                    branch: document.getElementById('repl-branch').value
                };
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (result.status === 'success') {
                    currentReplRecords = result.data;
                    renderReplTable(searchVal);
                } else {
                    replTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 30px;">Error loading records.</td></tr>';
                }
            } catch (error) {
                console.error('Error fetching replacement records:', error);
                replTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 30px;">Error fetching data. Check network.</td></tr>';
            } finally {
                btnLoadReplacements.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    if (replSearchWarranty) {
        replSearchWarranty.addEventListener('input', () => {
            renderReplTable(replSearchWarranty.value.trim().toLowerCase());
        });
    }

    const replBranchSelect = document.getElementById('repl-branch');
    if (replBranchSelect) {
        replBranchSelect.addEventListener('change', () => {
            const searchVal = replSearchWarranty ? replSearchWarranty.value.trim().toLowerCase() : '';
            renderReplTable(searchVal);
        });
    }

    const replSortDate = document.getElementById('repl-sort-date');
    const replSortIcon = document.getElementById('repl-sort-icon');
    if (replSortDate) {
        replSortDate.addEventListener('click', () => {
            if (window.replSortAsc === undefined) window.replSortAsc = true;
            window.replSortAsc = !window.replSortAsc;
            if (replSortIcon) {
                replSortIcon.innerHTML = window.replSortAsc ? '↑' : '↓';
            }
            const searchVal = replSearchWarranty ? replSearchWarranty.value.trim().toLowerCase() : '';
            renderReplTable(searchVal);
        });
    }

    function renderReplTable(searchStr) {
        if (!currentReplRecords || currentReplRecords.length === 0) {
            replTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No records found.</td></tr>';
            return;
        }

        let filtered = currentReplRecords;
        
        const branchFilter = document.getElementById('repl-branch').value;
        if (branchFilter && branchFilter !== 'All') {
            filtered = filtered.filter(row => row[1] === branchFilter);
        }

        // Filter out items that are already replaced? Or show all?
        // Let's just show all that match the search string
        if (searchStr) {
            filtered = filtered.filter(row => {
                const warrantyNum = (row[10] || '').toString().toLowerCase(); // Col K (10)
                return warrantyNum.includes(searchStr);
            });
        }

        if (window.replSortAsc === undefined) window.replSortAsc = true;
        filtered.sort((a, b) => {
            const dateA = new Date(a[0] || 0).getTime();
            const dateB = new Date(b[0] || 0).getTime();
            return window.replSortAsc ? dateA - dateB : dateB - dateA;
        });

        replTableBody.innerHTML = '';
        
        if (filtered.length === 0) {
            replTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No matching records found.</td></tr>';
            return;
        }

        filtered.forEach(row => {
            const tr = document.createElement('tr');
            
            // A:0 Date, B:1 Branch, D:3 Item Desc, E:4 Serial#, J:9 Status, K:10 Warranty#
            let dateStr = row[0] || '';
            if (dateStr && dateStr.includes('T')) dateStr = dateStr.split('T')[0];

                          const valStatusHtml = row[13] ? `<span class="status-badge status-${row[13].toString().toLowerCase().replace(/\s+/g, '-')}">${row[13]}</span>` : `<span style="display: inline-flex; justify-content: center; align-items: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #64748b; font-size: 0.8em;">-</span>`;
              const warrantyHtml = row[10] ? `<span style="font-family: monospace; font-size: 0.85em; color: #c084fc; font-weight: 600;">${row[10]}</span>` : '';

              tr.innerHTML = 
                  `<td>${dateStr}</td>
                  <td>${row[1] || ''}</td>
                  <td>${row[3] || ''}</td>
                  <td style="color: #fbbf24; font-style: italic;">${row[7] || ''}</td>
                  <td>${row[4] || ''}</td>
                  <td>${valStatusHtml}</td>
                  <td>${warrantyHtml}</td>`;

              const actionTd = document.createElement('td');
              
              const currentStatus = (row[13] || '').toString().toLowerCase();
              
              const btn = document.createElement('button');
              btn.innerHTML = '<i class="fas fa-edit"></i> Update';
              btn.style.cssText = 'background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;';
              btn.addEventListener('click', () => openItemReplacementForm(row));
              actionTd.appendChild(btn);
              tr.appendChild(actionTd);
              replTableBody.appendChild(tr);
        });
    }

    function openItemReplacementForm(row) {
        document.getElementById('item-replacement-container').classList.add('hidden');
        const formContainer = document.getElementById('item-replacement-form-container');
        formContainer.classList.remove('hidden');
        const innerContainer = formContainer.querySelector('.container');
        if (innerContainer) innerContainer.classList.remove('hidden');
        
        // A:0 to Q:16
        const rowIndex = row[row.length - 1]; // row object from backend appends rowIndex at the end
        document.getElementById('repl-form-row-index').value = rowIndex;
        
        let dateStr = row[0] || '';
        if (dateStr && dateStr.includes('T')) dateStr = dateStr.split('T')[0];

        document.getElementById('repl-form-warranty-num').textContent = row[10] || '-';
        document.getElementById('repl-form-recorded-date').textContent = dateStr || '-';
        document.getElementById('repl-form-branch').textContent = row[1] || '-';
        document.getElementById('repl-form-tech').textContent = row[2] || '-';
        document.getElementById('repl-form-item-desc').textContent = row[3] || '-';
        document.getElementById('repl-form-serial').textContent = row[4] || '-';
        document.getElementById('repl-form-status').textContent = row[9] || '-';
        document.getElementById('repl-form-val-status').textContent = row[13] || '-';
        document.getElementById('repl-form-assigned-tech').textContent = row[14] || '-';
        document.getElementById('repl-form-issue').textContent = row[7] || '-';

        // Clear input fields (R to V)
        const today = new Date();
        document.getElementById('repl-form-date-received').valueAsDate = today;
        document.getElementById('repl-form-repl-item-desc').value = '';
        document.getElementById('repl-form-repl-serial').value = '';
        document.getElementById('repl-form-overall-status').value = '';
        
        const loggedInUser = sessionStorage.getItem('loggedInUser') || '';
        document.getElementById('repl-form-sup-approver').value = loggedInUser;
        
        document.getElementById('item-replacement-status-message').classList.add('hidden');
    }

    const itemReplacementForm = document.getElementById('item-replacement-form');
    if (itemReplacementForm) {
        itemReplacementForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const rowIndex = document.getElementById('repl-form-row-index').value;
            if (!rowIndex) return;

            const dateReceived = document.getElementById('repl-form-date-received').value;
            const replItemDesc = document.getElementById('repl-form-repl-item-desc').value;
            const replSerial = document.getElementById('repl-form-repl-serial').value;
            const supApprover = document.getElementById('repl-form-sup-approver').value;
            const overallStatus = document.getElementById('repl-form-overall-status').value;

            const replacementData = [dateReceived, replItemDesc, replSerial, supApprover, overallStatus];

            const btnSubmit = document.getElementById('btn-submit-item-replacement');
            const btnText = btnSubmit.querySelector('.btn-text');
            const spinner = btnSubmit.querySelector('.spinner');
            const statusMsg = document.getElementById('item-replacement-status-message');
            
            btnSubmit.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMsg.classList.add('hidden');

            try {
                const formData = {
                    action: 'updateItemReplacement',
                    rowIndex: rowIndex,
                    replacementData: replacementData,
                    encodedBy: sessionStorage.getItem('loggedInUser')
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    statusMsg.textContent = 'Replacement submitted successfully!';
                    statusMsg.className = 'success';
                    statusMsg.classList.remove('hidden');
                    
                    setTimeout(() => {
                        document.getElementById('item-replacement-form-container').classList.add('hidden');
                        document.getElementById('item-replacement-container').classList.remove('hidden');
                        btnLoadReplacements.click(); // reload list
                    }, 1500);
                } else {
                    statusMsg.textContent = result.message || 'Error updating record.';
                    statusMsg.className = 'error';
                    statusMsg.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error submitting replacement:', error);
                statusMsg.textContent = 'Network error. Please try again.';
                statusMsg.className = 'error';
                statusMsg.classList.remove('hidden');
            } finally {
                btnSubmit.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }
});


