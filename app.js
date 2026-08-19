// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD4bJL8y0K0Kb3cKFA2Dm_OlDoPeTeo6MtiRzB_B8WBeX7GiU0gU2EBVAwd31BMPWV/exec';

// Fix 32: "Failed to fetch" is a raw network-layer error (not a backend
// error) -- it happens when the Apps Script web app is slow to cold-start or
// a mobile/wifi connection drops an idle request. A plain fetch() has no
// built-in timeout and no retry, so a single slow/hiccuping request looked
// like a dead end to the user. This helper adds (a) a client-side timeout via
// AbortController so a hung request fails fast instead of hanging
// indefinitely, and (b) automatic retries with a short backoff for
// network-level failures (fetch throwing / timing out) -- NOT for
// application-level errors (HTTP response that parses fine but has
// status !== "success"), since retrying those would just repeat the same
// backend error. Used by Daily Sales first; safe to reuse for any other POST
// to SCRIPT_URL.
async function postToScriptWithRetry(payload, { retries = 2, timeoutMs = 20000, retryDelayMs = 1200 } = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timer);
            return await response.json();
        } catch (error) {
            clearTimeout(timer);
            lastError = error;
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, retryDelayMs));
            }
        }
    }
    throw lastError;
}

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

        const aiChatFabEl = document.getElementById('ai-chat-fab');
        if (aiChatFabEl) aiChatFabEl.classList.remove('hidden');
        
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

        // Hide/Show Item Replacement based on Role (Owner, Manager, Supervisor only)
        const btnItemReplacementMenu = document.getElementById('btn-item-replacement');
        if (btnItemReplacementMenu) {
            const isAllowedItemReplacementRole = (role === 'Owner' || role === 'Manager' || role === 'Supervisor');
            btnItemReplacementMenu.style.display = isAllowedItemReplacementRole ? '' : 'none';
        }

        // Hide/Show Warranty Validation based on Role (Owner, Manager, RMA Admin only)
        const btnWarrantyValidationMenu = document.getElementById('btn-warranty-validation');
        if (btnWarrantyValidationMenu) {
            const isAllowedValidationRole = (role === 'Owner' || role === 'Manager' || role === 'RMA Admin');
            btnWarrantyValidationMenu.style.display = isAllowedValidationRole ? '' : 'none';
        }
        
        // Hide/Show MarvsPCStufz Button based on Store
        const menuMarvsPcBtnApp = document.getElementById('menu-marvspc-btn');
        if (menuMarvsPcBtnApp) {
            const isAllowedStore = (store === 'All' || store === 'MarvsPCStufz');

            if (isAllowedStore) {
                menuMarvsPcBtnApp.style.display = '';
            } else {
                menuMarvsPcBtnApp.style.display = 'none';
            }
        }

        // Hide/Show Manual Quotation based on Store (Fix 20) -- same access rule
        // the user asked for as the MarvsPCStufz button itself, above: only
        // accounts set to store "All" or store "MarvsPCStufz" can see this button.
        const menuManualQuotationBtnApp = document.getElementById('menu-manual-quotation-btn');
        if (menuManualQuotationBtnApp) {
            const isAllowedQuotationStore = (store === 'All' || store === 'MarvsPCStufz');
            menuManualQuotationBtnApp.style.display = isAllowedQuotationStore ? '' : 'none';
        }

        // Hide/Show Sheet Health Check based on Role (Fix 35) -- per the user's
        // explicit request, ONLY the Owner role should ever see this button;
        // everyone else (Manager, Supervisor, RMA Admin, Technician, etc.) must
        // not see it at all under the MarvsPCStufz menu.
        const menuMarvsPcSheetHealthBtnApp = document.getElementById('menu-marvspc-sheet-health-btn');
        if (menuMarvsPcSheetHealthBtnApp) {
            menuMarvsPcSheetHealthBtnApp.style.display = (role === 'Owner') ? '' : 'none';
        }
    }

    function showLogin() {
        hideAllContainers();
        loginContainer.classList.remove('hidden');
        loginForm.reset();
        welcomeMessage.textContent = 'MGH Daily Expenses';

        const aiChatFabEl = document.getElementById('ai-chat-fab');
        const aiChatPanelEl = document.getElementById('ai-chat-panel');
        if (aiChatFabEl) aiChatFabEl.classList.add('hidden');
        if (aiChatPanelEl) aiChatPanelEl.classList.add('hidden');
        if (window.speechSynthesis) window.speechSynthesis.cancel(); // stop any AI voice reply mid-sentence on logout
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

    const menuMarvsPcCustomerInfoBtn = document.getElementById('menu-marvspc-customer-info-btn');
    if (menuMarvsPcCustomerInfoBtn) {
        menuMarvsPcCustomerInfoBtn.addEventListener('click', () => {
            hideAllContainers();
            const customerInfoContainer = document.getElementById('marvspc-customer-info-container');
            if (customerInfoContainer) customerInfoContainer.classList.remove('hidden');
            const ciDate = document.getElementById('ci-date');
            if (ciDate && !ciDate.value) ciDate.valueAsDate = new Date();
            const ciSalesAdmin = document.getElementById('ci-sales-admin');
            if (ciSalesAdmin) ciSalesAdmin.value = sessionStorage.getItem('loggedInUser') || '';
        });
    }

    const menuMarvsPcPurchasedOrderBtn = document.getElementById('menu-marvspc-purchased-order-btn');
    if (menuMarvsPcPurchasedOrderBtn) {
        menuMarvsPcPurchasedOrderBtn.addEventListener('click', () => {
            hideAllContainers();
            const purchasedOrderContainer = document.getElementById('marvspc-purchased-order-container');
            if (purchasedOrderContainer) purchasedOrderContainer.classList.remove('hidden');
            const poDate = document.getElementById('po-date-requested');
            if (poDate && !poDate.value) poDate.valueAsDate = new Date();
            const poAdmin = document.getElementById('po-admin-requested');
            if (poAdmin) poAdmin.value = sessionStorage.getItem('loggedInUser') || '';
            // Fix 24: this container/form is now reused for editing an existing
            // Purchased Order record too (see the "Modify/Edit" button in the
            // View & Edit Purchased Order list). Opening it fresh from the menu
            // must clear any leftover edit state from a previous edit session.
            const poRowIndex = document.getElementById('po-row-index');
            if (poRowIndex) poRowIndex.value = '';
            const poFormHeading = document.getElementById('po-form-heading');
            if (poFormHeading) poFormHeading.textContent = 'New Purchase Request';
            const poSubmitBtnTextReset = document.querySelector('#po-submit-btn .btn-text');
            if (poSubmitBtnTextReset) poSubmitBtnTextReset.textContent = 'Submit Request';
        });
    }

    const menuMarvsPcDeliveriesBtn = document.getElementById('menu-marvspc-deliveries-btn');
    if (menuMarvsPcDeliveriesBtn) {
        menuMarvsPcDeliveriesBtn.addEventListener('click', () => {
            hideAllContainers();
            const deliveriesContainer = document.getElementById('marvspc-deliveries-container');
            if (deliveriesContainer) deliveriesContainer.classList.remove('hidden');
        });
    }

    // Simple placeholder navigation for remaining new MarvsPCStufz menu items
    // ("Build Status" upgraded to a real read-only list view in Fix 14, "Daily Sales"
    // (was "Customer Support") upgraded to a real weekly view in Fix 25 -- see their
    // own dedicated sections, wired separately). Nothing left in this array for now;
    // kept as the drop-in spot for any future still-unbuilt placeholder menu item.
    [
    ].forEach(([btnId, containerId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                hideAllContainers();
                const container = document.getElementById(containerId);
                if (container) container.classList.remove('hidden');
            });
        }
    });

    // ======= Daily Sales (Fix 25) =======
    // "Daily Sales" was a "Coming Soon" placeholder under the MarvsPCStufz menu
    // (originally labeled "Customer Support"). Per the user's spec: the "daily
    // sales" number for a given date is simply how many Customer Information
    // Sheet rows (customer/build entries) were recorded on that date -- shown as
    // a Monday-to-Saturday weekly breakdown (Sunday intentionally excluded, per
    // spec) with a week total, plus Prev/Next Week navigation. Reuses the
    // existing generic getExpenseRecords action (already used by every other
    // View & Edit list in this app) rather than adding a new backend action --
    // it already returns date-range-filtered raw rows for any sheet by name, so
    // counting-by-date is done here on the frontend from that same response.
    const menuMarvsPcCustomerSupportBtn = document.getElementById('menu-marvspc-customer-support-btn');
    const dsWeekPick = document.getElementById('ds-week-pick');
    const dsLoadBtn = document.getElementById('ds-load-btn');
    const dsPrevWeekBtn = document.getElementById('ds-prev-week-btn');
    const dsNextWeekBtn = document.getElementById('ds-next-week-btn');
    const dsTableBody = document.getElementById('ds-table-body');
    const dsTotalCell = document.getElementById('ds-total-cell');
    const dsWeekRangeLabel = document.getElementById('ds-week-range-label');
    const dsTopAdminName = document.getElementById('ds-top-admin-name');
    const dsTopAdminCount = document.getElementById('ds-top-admin-count');
    const dsTopCustomerName = document.getElementById('ds-top-customer-name');
    const dsTopCustomerCount = document.getElementById('ds-top-customer-count');
    const dsTopPageName = document.getElementById('ds-top-page-name');
    const dsTopPageCount = document.getElementById('ds-top-page-count');
    const dsTopBuildTypeName = document.getElementById('ds-top-buildtype-name');
    const dsTopBuildTypeCount = document.getElementById('ds-top-buildtype-count');

    // Fix 33: Top Performers -- for a given Customer Information Sheet
    // column index, sum "Number of Builds" (column E, index 4) grouped by
    // that column's value across the SAME rows already fetched for the
    // week's table (no separate backend call). Rows with a blank value for
    // that specific column are skipped for that dimension (a blank Sales
    // Admin shouldn't count as a "" winner), but can still count toward the
    // other dimensions. If nobody has builds > 0, show "Wala pang data" per
    // the user's explicit spec. If two or more tie for the highest total,
    // list all of them (comma-separated) rather than arbitrarily picking one.
    function dsComputeTopBy(rows, columnIndex) {
        // Fix 34: group by a NORMALIZED key (trimmed, collapsed internal
        // whitespace, lowercased) so free-text data-entry inconsistencies --
        // e.g. "PC Marvs" vs "PC  Marvs" vs "pc marvs" typed on different
        // rows -- don't get split into separate buckets and silently dilute
        // the real total for what is actually the same admin/page/customer/
        // build-type. The DISPLAYED name still uses the original (trimmed,
        // whitespace-collapsed) casing from the first row seen for that key.
        const totals = {};       // normalizedKey -> summed builds
        const displayNames = {}; // normalizedKey -> original-cased display text
        rows.forEach(row => {
            const raw = (row[columnIndex] || '').toString().trim().replace(/\s+/g, ' ');
            if (!raw) return;
            const normKey = raw.toLowerCase();
            const numBuilds = parseInt(row[4], 10) || 0;
            totals[normKey] = (totals[normKey] || 0) + numBuilds;
            if (!(normKey in displayNames)) displayNames[normKey] = raw;
        });
        let maxCount = 0;
        Object.keys(totals).forEach(key => {
            if (totals[key] > maxCount) maxCount = totals[key];
        });
        if (maxCount <= 0) return { names: null, count: 0 };
        const winners = Object.keys(totals).filter(key => totals[key] === maxCount).map(key => displayNames[key]);
        return { names: winners.join(', '), count: maxCount };
    }

    function dsRenderTopPerformers(rows) {
        const dims = [
            { columnIndex: 15, nameEl: dsTopAdminName, countEl: dsTopAdminCount },      // Column P: Sales Admin
            { columnIndex: 1, nameEl: dsTopCustomerName, countEl: dsTopCustomerCount }, // Column B: Customer Name
            { columnIndex: 16, nameEl: dsTopPageName, countEl: dsTopPageCount },        // Column Q: MarvsPC Page
            { columnIndex: 5, nameEl: dsTopBuildTypeName, countEl: dsTopBuildTypeCount } // Column F: Type of Build
        ];
        dims.forEach(dim => {
            const top = dsComputeTopBy(rows, dim.columnIndex);
            if (dim.nameEl) dim.nameEl.textContent = top.names === null ? 'Wala pang data' : top.names;
            if (dim.countEl) dim.countEl.textContent = top.count;
        });
    }

    function dsResetTopPerformers() {
        [dsTopAdminName, dsTopCustomerName, dsTopPageName, dsTopBuildTypeName].forEach(el => { if (el) el.textContent = 'Wala pang data'; });
        [dsTopAdminCount, dsTopCustomerCount, dsTopPageCount, dsTopBuildTypeCount].forEach(el => { if (el) el.textContent = '0'; });
    }

    function dsFormatDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Given any Date, return that week's Monday (weeks run Mon-Sat per spec).
    // Date.getDay(): 0=Sun,1=Mon,...6=Sat. A Sunday is treated as belonging to
    // the Mon-Sat week that just ended (i.e. the Monday 6 days before it), not
    // the week about to start.
    function dsGetMondayOf(d) {
        const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const day = date.getDay();
        const diffToMonday = day === 0 ? -6 : (1 - day);
        date.setDate(date.getDate() + diffToMonday);
        return date;
    }

    async function dsLoadWeek() {
        if (!dsWeekPick || !dsWeekPick.value) return;
        const picked = new Date(dsWeekPick.value + 'T00:00:00');
        const monday = dsGetMondayOf(picked);
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);

        const startStr = dsFormatDate(monday);
        const endStr = dsFormatDate(saturday);
        if (dsWeekRangeLabel) dsWeekRangeLabel.textContent = `Linggo: ${startStr} (Mon) hanggang ${endStr} (Sat)`;

        const btnText = dsLoadBtn ? dsLoadBtn.querySelector('.btn-text') : null;
        const spinner = dsLoadBtn ? dsLoadBtn.querySelector('.spinner') : null;
        if (dsLoadBtn) dsLoadBtn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (spinner) spinner.classList.remove('hidden');
        if (dsTableBody) dsTableBody.innerHTML = '<tr><td colspan="3" style="padding: 15px; text-align: center; color: var(--text-muted);">Loading... (pwedeng matagal kung malayo o mabagal ang connection)</td></tr>';

        try {
            const result = await postToScriptWithRetry({
                action: 'getExpenseRecords',
                sheetName: 'Customer Information Sheet',
                startDate: startStr,
                endDate: endStr,
                branch: 'All',
                noCache: true
            });
            if (result.status !== 'success') {
                if (dsTableBody) dsTableBody.innerHTML = `<tr><td colspan="3" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load records'}</td></tr>`;
                if (dsTotalCell) dsTotalCell.textContent = '0';
                dsResetTopPerformers();
                return;
            }

            // Fix 25b: "Daily Sales" for a date is the SUM of "Number of Builds"
            // (column E, index 4) across every row on that date -- NOT a plain row
            // count. A single customer entry can represent multiple builds (e.g.
            // "11" in one row), so summing that column is what actually reflects
            // sales volume for the day, not just how many customers/orders came in.
            const countsByDate = {};
            (result.data || []).forEach(row => {
                const dateStr = (row[0] || '').toString().split(/[T ]/)[0];
                if (!dateStr) return;
                const numBuilds = parseInt(row[4], 10) || 0;
                countsByDate[dateStr] = (countsByDate[dateStr] || 0) + numBuilds;
            });

            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayStr = dsFormatDate(new Date());
            let rowsHtml = '';
            let total = 0;
            for (let i = 0; i < 6; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dStr = dsFormatDate(d);
                const count = countsByDate[dStr] || 0;
                total += count;
                const isToday = dStr === todayStr;
                rowsHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);${isToday ? ' background: rgba(59,130,246,0.12);' : ''}">
                    <td style="padding: 8px;">${dayNames[i]}</td>
                    <td style="padding: 8px;">${dStr}</td>
                    <td style="padding: 8px; font-weight: 600;">${count}</td>
                </tr>`;
            }
            if (dsTableBody) dsTableBody.innerHTML = rowsHtml;
            if (dsTotalCell) dsTotalCell.textContent = total;
            dsRenderTopPerformers(result.data || []);
        } catch (error) {
            // Fix 32: postToScriptWithRetry already retried automatically on
            // network-level failures (timeout / "Failed to fetch") before
            // throwing here, so if we land in this catch it genuinely could
            // not connect after retrying. Show a Filipino-friendly message
            // and an inline Retry link (instead of just a dead-end error row)
            // so the user doesn't have to hunt for the Load button again.
            const isNetworkError = error && (error.name === 'AbortError' || /fetch/i.test(error.message || ''));
            const friendlyMsg = isNetworkError
                ? 'Hindi ma-contact ang server (baka mabagal ang connection o nag-timeout). Subukan ulit.'
                : `Error: ${error.message}`;
            if (dsTableBody) dsTableBody.innerHTML = `<tr><td colspan="3" style="padding: 15px; text-align: center; color: #ef4444;">${friendlyMsg} <button type="button" id="ds-retry-btn" style="margin-left: 8px; background: #ef4444; color: white; border: none; border-radius: 6px; padding: 4px 10px; cursor: pointer;">Retry</button></td></tr>`;
            if (dsTotalCell) dsTotalCell.textContent = '0';
            dsResetTopPerformers();
            const retryBtn = document.getElementById('ds-retry-btn');
            if (retryBtn) retryBtn.addEventListener('click', dsLoadWeek);
        } finally {
            if (dsLoadBtn) dsLoadBtn.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (spinner) spinner.classList.add('hidden');
        }
    }

    if (menuMarvsPcCustomerSupportBtn) {
        menuMarvsPcCustomerSupportBtn.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('marvspc-customer-support-container');
            if (container) container.classList.remove('hidden');
            if (dsWeekPick && !dsWeekPick.value) dsWeekPick.valueAsDate = new Date();
            dsLoadWeek();
        });
    }

    if (dsLoadBtn) {
        dsLoadBtn.addEventListener('click', dsLoadWeek);
    }

    if (dsPrevWeekBtn) {
        dsPrevWeekBtn.addEventListener('click', () => {
            if (dsWeekPick && !dsWeekPick.value) dsWeekPick.valueAsDate = new Date();
            const d = new Date(dsWeekPick.value + 'T00:00:00');
            d.setDate(d.getDate() - 7);
            dsWeekPick.value = dsFormatDate(d);
            dsLoadWeek();
        });
    }

    if (dsNextWeekBtn) {
        dsNextWeekBtn.addEventListener('click', () => {
            if (dsWeekPick && !dsWeekPick.value) dsWeekPick.valueAsDate = new Date();
            const d = new Date(dsWeekPick.value + 'T00:00:00');
            d.setDate(d.getDate() + 7);
            dsWeekPick.value = dsFormatDate(d);
            dsLoadWeek();
        });
    }

    // ======= Sheet Health Check (Fix 28) =======
    // A lightweight "how big is our database" report -- calls the backend's
    // getSheetHealthCheck action, which lists every Google Sheet tab with its
    // used row/column count, and renders it as a simple table + summary line
    // (total cells used out of Google Sheets' 10,000,000-cell-per-spreadsheet
    // cap). Auto-loads on menu open, same convention as Daily Sales/Deliveries.
    async function shLoadHealthCheck() {
        const tbody = document.getElementById('sh-table-body');
        const summaryEl = document.getElementById('sh-summary');
        const refreshBtn = document.getElementById('sh-refresh-btn');
        if (!tbody) return;

        if (refreshBtn) refreshBtn.disabled = true;
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        if (summaryEl) summaryEl.textContent = 'Loading...';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'getSheetHealthCheck' })
            });
            const result = await response.json();

            if (result.status === 'success' && result.data) {
                const sheets = result.data.sheets || [];
                const totalCellsUsed = result.data.totalCellsUsed || 0;
                const cellCap = result.data.cellCap || 10000000;
                const pctUsed = cellCap > 0 ? ((totalCellsUsed / cellCap) * 100) : 0;

                if (summaryEl) {
                    summaryEl.innerHTML = `Total cells used: <strong>${totalCellsUsed.toLocaleString()}</strong> / ${cellCap.toLocaleString()} (${pctUsed.toFixed(2)}% of the Google Sheets cap)`;
                }

                if (sheets.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="padding: 15px; text-align: center; color: var(--text-muted);">No sheets found.</td></tr>';
                } else {
                    tbody.innerHTML = sheets.map(sh => `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 8px 10px; font-weight: 500;">${sh.name || ''}</td>
                            <td style="padding: 8px 10px;">${(sh.dataRows || 0).toLocaleString()}</td>
                            <td style="padding: 8px 10px;">${(sh.columns || 0).toLocaleString()}</td>
                            <td style="padding: 8px 10px;">${(sh.cellsUsed || 0).toLocaleString()}</td>
                        </tr>
                    `).join('');
                }
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load sheet health check'}</td></tr>`;
                if (summaryEl) summaryEl.textContent = '';
            }
        } catch (error) {
            console.error('Error loading sheet health check:', error);
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #ef4444;">Network error. Please try again.</td></tr>';
            if (summaryEl) summaryEl.textContent = '';
        } finally {
            if (refreshBtn) refreshBtn.disabled = false;
        }
    }

    const menuMarvsPcSheetHealthBtn = document.getElementById('menu-marvspc-sheet-health-btn');
    if (menuMarvsPcSheetHealthBtn) {
        menuMarvsPcSheetHealthBtn.addEventListener('click', () => {
            // Fix 35: defense-in-depth -- the button itself is hidden for
            // non-Owner roles in showApp() below, but re-check here too in
            // case the button was already in the DOM from before a role
            // change (e.g. logout/login as a different role in the same tab).
            if (sessionStorage.getItem('userRole') !== 'Owner') return;
            hideAllContainers();
            const container = document.getElementById('marvspc-sheet-health-container');
            if (container) container.classList.remove('hidden');
            shLoadHealthCheck();
        });
    }

    const shRefreshBtn = document.getElementById('sh-refresh-btn');
    if (shRefreshBtn) {
        shRefreshBtn.addEventListener('click', shLoadHealthCheck);
    }

    // ======= Manual Quotation (Fix 20) =======
    // A brand-new main-menu-level feature (NOT under the MarvsPCStufz submenu) --
    // per the user's spec: Date/Customer Name/Company Name/Mobile#/Address, plus a
    // flexible (add/remove) list of item rows (Description/Qty/Amount), with
    // per-row Total SRP (qty x amount) computed live, a running Total Qty and
    // Total Amount (before discount), a Discount field, and a final Total Amount.
    // Saved as ONE row per quotation in a new "Manual Quotation" sheet -- the
    // variable-length item list is stored as a JSON string in a single "Items"
    // column, per the user's explicit choice (see the AskUserQuestion round on
    // storage design) over a normalized two-sheet design. This keeps the save
    // action simple (one appendRow, no ID-linking between sheets) and reuses the
    // same "1 record = 1 row" shape every other sheet in this app already uses.
    function mqAddItemRow(data) {
        const tbody = document.getElementById('mq-items-body');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 4px 8px; vertical-align: top;"><textarea class="mq-row-desc" rows="1" style="width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 8px; color: var(--text-light); font-family: inherit; font-size: 0.88em;">${data && data.desc ? data.desc : ''}</textarea></td>
            <td style="padding: 4px 8px; vertical-align: top;"><input type="number" class="mq-row-qty" min="0" step="1" value="${data && data.qty ? data.qty : ''}" style="width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 8px; color: var(--text-light); font-size: 0.88em;"></td>
            <td style="padding: 4px 8px; vertical-align: top;"><input type="number" class="mq-row-amount" min="0" step="0.01" value="${data && data.amount ? data.amount : ''}" style="width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 8px; color: var(--text-light); font-size: 0.88em;"></td>
            <td style="padding: 8px 8px; vertical-align: top; color: var(--primary); font-weight: 600; font-size: 0.88em;" class="mq-row-total">₱0.00</td>
            <td style="padding: 4px 8px; vertical-align: top; text-align: center;"><button type="button" class="mq-btn-remove-row" title="Remove row" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #ef4444; border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 0.85em;">✕</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.mq-row-qty').addEventListener('input', mqRecompute);
        tr.querySelector('.mq-row-amount').addEventListener('input', mqRecompute);
        tr.querySelector('.mq-btn-remove-row').addEventListener('click', () => {
            tr.remove();
            mqRecompute();
        });
    }

    function mqRecompute() {
        const tbody = document.getElementById('mq-items-body');
        if (!tbody) return;
        let totalQty = 0;
        let totalBeforeDiscount = 0;
        tbody.querySelectorAll('tr').forEach(tr => {
            const qty = parseFloat(tr.querySelector('.mq-row-qty').value) || 0;
            const amount = parseFloat(tr.querySelector('.mq-row-amount').value) || 0;
            const rowTotal = qty * amount;
            tr.querySelector('.mq-row-total').textContent = '₱' + formatCurrency(rowTotal);
            totalQty += qty;
            totalBeforeDiscount += rowTotal;
        });
        const discount = parseFloat(document.getElementById('mq-discount').value) || 0;
        const finalTotal = Math.max(totalBeforeDiscount - discount, 0);
        document.getElementById('mq-total-qty').textContent = totalQty;
        document.getElementById('mq-total-before').textContent = '₱' + formatCurrency(totalBeforeDiscount);
        document.getElementById('mq-total-final').textContent = '₱' + formatCurrency(finalTotal);
    }

    function mqResetForm() {
        const form = document.getElementById('manual-quotation-form');
        if (form) form.reset();
        const dateEl = document.getElementById('mq-date');
        if (dateEl) dateEl.valueAsDate = new Date();
        const mobileEl = document.getElementById('mq-mobile');
        if (mobileEl) mobileEl.value = '';
        const discountEl = document.getElementById('mq-discount');
        if (discountEl) discountEl.value = '0';
        const tbody = document.getElementById('mq-items-body');
        if (tbody) tbody.innerHTML = '';
        mqAddItemRow(null); // start with one blank item row
        mqRecompute();
        const statusMsg = document.getElementById('mq-status-message');
        if (statusMsg) statusMsg.classList.add('hidden');
        // Fix 27: also clear any leftover edit-mode state (row index, original
        // Quotation #/Encoded By, heading text, submit button label) so opening
        // this form fresh from the main menu never silently resumes editing a
        // previously-clicked record -- same guard Purchased Order's Fix 24 uses.
        const rowIndexEl = document.getElementById('mq-row-index');
        if (rowIndexEl) rowIndexEl.value = '';
        const quotationNumberEl = document.getElementById('mq-quotation-number');
        if (quotationNumberEl) quotationNumberEl.value = '';
        const origEncodedByEl = document.getElementById('mq-original-encoded-by');
        if (origEncodedByEl) origEncodedByEl.value = '';
        const headingEl = document.getElementById('mq-form-heading');
        if (headingEl) headingEl.textContent = 'Manual Quotation';
        const submitBtnReset = document.getElementById('mq-submit-btn');
        if (submitBtnReset) {
            const btnTextReset = submitBtnReset.querySelector('.btn-text');
            if (btnTextReset) btnTextReset.textContent = 'Save Quotation';
        }
    }

    // Fix 27: populates the Manual Quotation form (fields + item rows) from an
    // existing saved record's row array, for the Manual Quotation Records list's
    // "Edit" button -- same "Modify/Edit re-uses the creation form" pattern as
    // Purchased Order's Fix 24. Row layout (see saveManualQuotation/getExpenseRecords
    // in google_apps_script.js): [0]Quotation#, [1]Date, [2]Customer Name,
    // [3]Company Name, [4]Mobile#, [5]Address, [6]Items(JSON), [7]Total Qty,
    // [8]Total Before Discount, [9]Discount, [10]Total Amount, [11]Encoded By,
    // [last]rowIndex.
    function mqLoadRecordIntoForm(row) {
        hideAllContainers();
        const container = document.getElementById('manual-quotation-container');
        if (container) container.classList.remove('hidden');

        const rowIndex = row[row.length - 1];
        const rowIndexEl = document.getElementById('mq-row-index');
        if (rowIndexEl) rowIndexEl.value = rowIndex;
        const quotationNumberEl = document.getElementById('mq-quotation-number');
        if (quotationNumberEl) quotationNumberEl.value = row[0] || '';
        // Fix 27: preserve the original "Encoded By" on edit -- don't silently
        // reassign authorship to whoever happens to be editing later, same rule
        // Fix 24b established for Purchased Order's Admin Requested field.
        const origEncodedByEl = document.getElementById('mq-original-encoded-by');
        if (origEncodedByEl) origEncodedByEl.value = row[11] || '';

        const dateStr = (row[1] || '').toString().split(/[T ]/)[0];
        const dateEl = document.getElementById('mq-date');
        if (dateEl) dateEl.value = dateStr;
        const customerNameEl = document.getElementById('mq-customer-name');
        if (customerNameEl) customerNameEl.value = row[2] || '';
        const companyNameEl = document.getElementById('mq-company-name');
        if (companyNameEl) companyNameEl.value = row[3] || '';
        const mobileEl = document.getElementById('mq-mobile');
        if (mobileEl) mobileEl.value = row[4] || '';
        const addressEl = document.getElementById('mq-address');
        if (addressEl) addressEl.value = row[5] || '';

        let items = [];
        try { items = JSON.parse(row[6] || '[]'); } catch (e) { items = []; }
        const tbody = document.getElementById('mq-items-body');
        if (tbody) tbody.innerHTML = '';
        if (items.length > 0) {
            items.forEach(it => mqAddItemRow(it));
        } else {
            mqAddItemRow(null);
        }

        const discountEl = document.getElementById('mq-discount');
        if (discountEl) discountEl.value = parseFloat(row[9]) || 0;
        mqRecompute();

        const statusMsg = document.getElementById('mq-status-message');
        if (statusMsg) statusMsg.classList.add('hidden');

        const headingEl = document.getElementById('mq-form-heading');
        if (headingEl) headingEl.textContent = 'Edit Quotation' + (row[0] ? (' ' + row[0]) : '');
        const submitBtn = document.getElementById('mq-submit-btn');
        if (submitBtn) {
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Update Quotation';
        }
    }

    const menuManualQuotationBtn = document.getElementById('menu-manual-quotation-btn');
    if (menuManualQuotationBtn) {
        menuManualQuotationBtn.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('manual-quotation-container');
            if (container) container.classList.remove('hidden');
            // Fix 27: mqResetForm() now also clears any leftover edit-mode state, so
            // opening this fresh from the main menu always starts a brand-new quotation
            // even if a "Modify/Edit" was left in progress on a previous visit.
            mqResetForm();
        });
    }

    // ======= Manual Quotation Records list view (Fix 21) =======
    // A plain container page (NOT a modal stacked over anything -- see gotcha #7),
    // reached via the "View Records" button on the Manual Quotation form. Auto-
    // loads immediately when opened (no separate "Load" click needed, per the
    // user's explicit request), defaulting to the last 3 weeks (gotcha #8). Date
    // range changes re-fetch from the backend (via the Search button); Customer
    // Name and Quotation # are cheap client-side filters over the already-loaded
    // rows, same "load once, filter locally" pattern as Build Tracker/Build Status.
    let currentManualQuotationRecords = [];
    // Tracks whatever array was most recently passed to renderManualQuotationListTable
    // (i.e. the FILTERED rows actually on screen, not necessarily every loaded row) --
    // the per-row Print button's delegated click handler (Fix 23) looks up the clicked
    // row here by index, since the row array itself isn't stored in the DOM.
    let currentMqListRenderedRows = [];

    function renderManualQuotationListTable(rows) {
        const tbody = document.getElementById('manual-quotation-list-table-body');
        if (!tbody) return;
        currentMqListRenderedRows = rows || [];
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map((row, idx) => {
            const dateStr = (row[1] || '').toString().split(/[T ]/)[0];
            const totalQty = row[7] || 0;
            const totalAmount = parseFloat(row[10]) || 0;
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 8px 10px; font-weight: 600; color: var(--primary);">${row[0] || ''}</td>
                    <td style="padding: 8px 10px;">${dateStr}</td>
                    <td style="padding: 8px 10px; font-weight: 500;">${row[2] || ''}</td>
                    <td style="padding: 8px 10px;">${row[3] || ''}</td>
                    <td style="padding: 8px 10px;">${row[4] || ''}</td>
                    <td style="padding: 8px 10px;">${totalQty}</td>
                    <td style="padding: 8px 10px; font-weight: 600;">₱${formatCurrency(totalAmount)}</td>
                    <td style="padding: 8px 10px;">${row[11] || ''}</td>
                    <td style="padding: 8px 10px; white-space: nowrap;">
                        <button type="button" class="btn-mq-print-row" data-mq-row-index="${idx}" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;"><i class="fas fa-print"></i> Print</button>
                        <button type="button" class="btn-mq-edit-row" data-mq-row-index="${idx}" style="background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-left: 4px;"><i class="fas fa-edit"></i> Edit</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Fix 23: per-row "Print" button on the Manual Quotation Records list, generating
    // a formal 2-page quotation PDF (page 1: MarvsPCStufz-branded quotation with the
    // real saved item breakdown; page 2: the full Replacement & Warranty Terms and
    // Conditions). Reuses the app's existing html2pdf-based PDF pattern (hidden
    // off-screen div + html2pdf().from(element).output('bloburl') into a pre-opened
    // tab) already used throughout app.js, rather than inventing a new print mechanism
    // -- see gotcha #11's "reuse, don't rebuild" principle.
    const MQ_BRAND = {
        name: 'MarvsPCStufz',
        tagline: 'Custom PC Builds & Computer Parts',
        address: 'Unit 7, Parian Commercial Complex, Old Balara, Quezon City',
        phone: '0998-860-2011',
        email: 'homelabsol@gmail.com'
    };

    function mqWarrantyTermsHtml() {
        return `
            <div id="mq-terms-page" style="page-break-before: always; padding-top: 10px;">
                <h2 style="text-align:center; color:#4f46e5; font-size:16px; border-bottom:3px solid #4f46e5; padding-bottom:12px; margin-bottom:16px; letter-spacing:0.3px;">REPLACEMENT AND WARRANTY TERMS AND CONDITIONS</h2>
                <p style="font-size:11px; color:#374151; margin-bottom:16px; line-height:1.5;">All items/parts of Marv's PC Stuffz will be released with SALES INVOICE indicating the date of purchase.</p>

                <div style="margin-bottom:14px;">
                    <h4 style="font-size:11.5px; font-weight:800; color:#1f2937; margin:0 0 5px; text-transform:uppercase; letter-spacing:0.04em;">Product Replacement</h4>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">Seven (7) days item replacement policy is followed; provided that it must be in good condition w/ complete accessories and packaging. Any form of physical damage will not be covered by seven (7) days replacement.</p>
                </div>

                <div style="margin-bottom:14px;">
                    <h4 style="font-size:11.5px; font-weight:800; color:#1f2937; margin:0 0 5px; text-transform:uppercase; letter-spacing:0.04em;">Product Warranty</h4>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">The Sales Invoice issued by Marv's PC Stufz must be presented together with the concerned item with the correct serial number and the warranty sticker is intact. <span style="font-weight:700; color:#b91c1c;">"NO sales invoice, NO WARRANTY."</span></p>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">During warranty period, Marv's PC Stufz will provide the warranty repair at our store, which <strong>DOES NOT INCLUDE ANY SOFTWARE PROBLEMS.</strong> If necessary, client should back up all your valuable files before bringing in your unit. Marv's PC Stufz will not be liable for any loss of data or files in your computer.</p>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0;"><strong>NO RETURN POLICY</strong> unless the product is defective.</p>
                </div>

                <div style="margin-bottom:14px;">
                    <h4 style="font-size:11.5px; font-weight:800; color:#1f2937; margin:0 0 5px; text-transform:uppercase; letter-spacing:0.04em;">Warranty Period</h4>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">Warranty period will start upon the date of item purchase. <strong>We DO NOT PROVIDE CASH REFUND.</strong></p>
                    <ul style="margin:4px 0 6px; padding-left:16px;">
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">12 Months: All parts</li>
                    </ul>
                </div>

                <div style="margin-bottom:14px;">
                    <h4 style="font-size:11.5px; font-weight:800; color:#1f2937; margin:0 0 5px; text-transform:uppercase; letter-spacing:0.04em;">Monitor Warranty for Dead Pixels</h4>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">LCD/LED that have 1-5 dead pixels are considered as good unit. Monitor that has 6 and more dead pixels are subject for warranty. Monitor for warranty should be complete with box, accessories, stand and styro packaging. Within the warranty period, all defective items are subject for inspection and repair only. The decision and duration of replacement depends on the distributor/manufacturer of the defective items.</p>
                </div>

                <div style="margin-bottom:14px;">
                    <h4 style="font-size:11.5px; font-weight:800; color:#1f2937; margin:0 0 5px; text-transform:uppercase; letter-spacing:0.04em;">The Warranty Does Not Cover the Following</h4>
                    <ul style="margin:4px 0 6px; padding-left:16px;">
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Warranty sticker is tampered or missing; warranty slip is not presented.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">The product serial number has been altered, defaced, or removed.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Freebies, promo items given away, raffle prizes, casing, mouse pads, cables.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Software issues such as defects/malfunction caused by viruses and software incompatibility.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Damage including bent pins, blown metal burns, cracks, corner, rust corrosion, molten wires, circuit board cut braces, scratches, dents, moist, pest infection, natural disaster.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Damage caused by the customer due to accident, transport, delivery, misuse, mishandling, negligence, incidents, or use of product in voltages other than designated.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Damages caused by self-repair or modification not authorized by Marv's PC Stufz.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">Incompatibility of items — checking specs and product compatibility should be the customer's responsibility. Marv's PC Stufz is not liable for any customer's decision.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;">There will be no on-site service and no lending of backup/service units.</li>
                        <li style="font-size:10.5px; color:#374151; line-height:1.55; margin-bottom:3px;"><strong>All shipping costs related to warranty concerns shall be shouldered by the customer.</strong></li>
                    </ul>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">In the event that the replacement for a defective item is no longer available (phased-out already), Marv's PC Stufz reserves the right to offer an alternative brand/model to the customer based on the current market value of the item or the actual purchase price, whichever is lower. In case of upgrades, Marv's PC Stufz reserves the right to ask for additional payment from the customer provided the said amount is agreeable to the customer (e.g., ₱350 upgrade from 250GB to 500GB hard disk).</p>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0;">In no event or circumstance will our company or our supplier be liable to the client for any direct, indirect, incidental, special, or consequential damages arising out of the use of any product or documentation like computer hardware, software, accessories, upgrades, etc., including any lost profit or lost savings or any claim by any party. We will not be held liable for delays on the items sent to third-party manufacturing either for repair or replacement.</p>
                </div>

                <div style="margin-bottom:14px;">
                    <h4 style="font-size:11.5px; font-weight:800; color:#1f2937; margin:0 0 5px; text-transform:uppercase; letter-spacing:0.04em;">Unclaimed Items</h4>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0 0 6px;">Any warranty items not claimed within 30 days from date of notice will be charged ₱50/day as a storage fee. <span style="font-weight:700; color:#b91c1c;">Warranty items not claimed within 90 days will be subject to disposal.</span></p>
                    <p style="font-size:10.5px; color:#374151; line-height:1.55; margin:0;">If the items were purchased online, it is considered that the customer agrees with the above warranty terms and conditions even without their signature.</p>
                </div>

                <div style="margin-top:18px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:10.5px; color:#374151; font-style:italic;">
                    Declaration: We declare that the invoice shows the actual price of the goods described.
                </div>
            </div>
        `;
    }

    function printManualQuotationRecord(row, btnEl) {
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btnEl.disabled = true;

        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating Quotation PDF...</h3>');
        } else {
            alert('Popup blocked! Please allow popups for this site to view the PDF.');
        }

        try {
            const quotationNumber = row[0] || '';
            const dateStr = (row[1] || '').toString().split(/[T ]/)[0];
            const customerName = row[2] || '';
            const companyName = row[3] || '';
            const mobile = row[4] || '';
            const address = row[5] || '';
            let items = [];
            try { items = JSON.parse(row[6] || '[]'); } catch (e) { items = []; }
            const totalQty = row[7] || 0;
            const totalBeforeDiscount = parseFloat(row[8]) || 0;
            const discount = parseFloat(row[9]) || 0;
            const totalAmount = parseFloat(row[10]) || 0;
            const encodedBy = row[11] || '';

            const dateFormatted = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

            let itemsRowsHtml = '';
            items.forEach(it => {
                const qty = parseFloat(it.qty) || 0;
                const amount = parseFloat(it.amount) || 0;
                itemsRowsHtml += `
                    <tr>
                        <td style="padding:9px 10px; font-size:13px; border-bottom:1px solid #f0f1f3; color:#1f2937;">${it.desc || ''}</td>
                        <td style="padding:9px 10px; font-size:13px; border-bottom:1px solid #f0f1f3; color:#1f2937; text-align:right;">${qty}</td>
                        <td style="padding:9px 10px; font-size:13px; border-bottom:1px solid #f0f1f3; color:#1f2937; text-align:right;">₱${formatCurrency(amount)}</td>
                        <td style="padding:9px 10px; font-size:13px; border-bottom:1px solid #f0f1f3; color:#1f2937; text-align:right;">₱${formatCurrency(qty * amount)}</td>
                    </tr>
                `;
            });

            const htmlString = `
                <div id="mq-print-wrapper" style="font-family: Arial, Helvetica, sans-serif; color:#111827; background:#ffffff; padding: 40px 44px; max-width: 800px; margin: 0 auto;">
                    <table style="width:100%; border-collapse:collapse; border-bottom:3px solid #4f46e5; padding-bottom:16px; margin-bottom:20px;">
                        <tr>
                            <td style="vertical-align:top; padding-bottom:16px;">
                                <table style="border-collapse:collapse;"><tr>
                                    <td style="width:46px; height:46px; background:#4f46e5; border-radius:10px; text-align:center; vertical-align:middle; color:#fff; font-size:22px; font-weight:700;">M</td>
                                    <td style="padding-left:12px; vertical-align:middle;">
                                        <div style="font-size:20px; font-weight:800; color:#1f2937; line-height:1.15;">${MQ_BRAND.name}</div>
                                        <div style="font-size:11.5px; color:#6b7280; margin-top:2px;">${MQ_BRAND.tagline}</div>
                                        <div style="font-size:11.5px; color:#6b7280; margin-top:5px;">📍 ${MQ_BRAND.address} &nbsp;|&nbsp; 📞 ${MQ_BRAND.phone}</div>
                                        <div style="font-size:11.5px; color:#6b7280;">✉️ ${MQ_BRAND.email}</div>
                                    </td>
                                </tr></table>
                            </td>
                            <td style="vertical-align:top; text-align:right; padding-bottom:16px;">
                                <div style="font-size:22px; font-weight:800; color:#4f46e5; letter-spacing:1px;">QUOTATION</div>
                                <div style="font-size:14px; font-weight:700; color:#1f2937; margin-top:4px;">${quotationNumber}</div>
                                <div style="font-size:12.5px; color:#6b7280; margin-top:2px;">Date: ${dateFormatted}</div>
                            </td>
                        </tr>
                    </table>

                    <table style="width:100%; margin-bottom:22px;">
                        <tr>
                            <td style="vertical-align:top; width:60%;">
                                <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#9ca3af; font-weight:700; margin-bottom:6px;">Quotation For</div>
                                <p style="margin:2px 0; font-size:13.5px; color:#1f2937;"><strong>${customerName}</strong></p>
                                ${companyName ? `<p style="margin:2px 0; font-size:13.5px; color:#1f2937;">${companyName}</p>` : ''}
                                ${mobile ? `<p style="margin:2px 0; font-size:12.5px; color:#6b7280;">Mobile#: ${mobile}</p>` : ''}
                                ${address ? `<p style="margin:2px 0; font-size:12.5px; color:#6b7280;">${address}</p>` : ''}
                            </td>
                            <td style="vertical-align:top; text-align:right;">
                                <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#9ca3af; font-weight:700; margin-bottom:6px;">Prepared By</div>
                                <p style="margin:2px 0; font-size:13.5px; color:#1f2937;"><strong>${encodedBy}</strong></p>
                                <p style="margin:2px 0; font-size:12.5px; color:#6b7280;">${MQ_BRAND.name}</p>
                            </td>
                        </tr>
                    </table>

                    <table style="width:100%; border-collapse:collapse; margin-bottom:18px;">
                        <thead>
                            <tr style="background:#f3f4f6;">
                                <th style="padding:9px 10px; font-size:11.5px; text-transform:uppercase; letter-spacing:0.04em; color:#374151; text-align:left; border-bottom:2px solid #e5e7eb;">Description</th>
                                <th style="padding:9px 10px; font-size:11.5px; text-transform:uppercase; letter-spacing:0.04em; color:#374151; text-align:right; border-bottom:2px solid #e5e7eb;">Qty</th>
                                <th style="padding:9px 10px; font-size:11.5px; text-transform:uppercase; letter-spacing:0.04em; color:#374151; text-align:right; border-bottom:2px solid #e5e7eb;">Unit Price</th>
                                <th style="padding:9px 10px; font-size:11.5px; text-transform:uppercase; letter-spacing:0.04em; color:#374151; text-align:right; border-bottom:2px solid #e5e7eb;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRowsHtml}
                        </tbody>
                    </table>

                    <div class="mq-avoid-break">
                        <table style="width:260px; margin-left:auto; margin-top:6px;">
                            <tr><td style="padding:5px 0; font-size:13.5px; color:#374151;">Total Qty</td><td style="padding:5px 0; font-size:13.5px; color:#374151; text-align:right;">${totalQty}</td></tr>
                            <tr><td style="padding:5px 0; font-size:13.5px; color:#374151;">Subtotal</td><td style="padding:5px 0; font-size:13.5px; color:#374151; text-align:right;">₱${formatCurrency(totalBeforeDiscount)}</td></tr>
                            <tr><td style="padding:5px 0; font-size:13.5px; color:#b91c1c;">Discount</td><td style="padding:5px 0; font-size:13.5px; color:#b91c1c; text-align:right;">− ₱${formatCurrency(discount)}</td></tr>
                            <tr><td style="padding:10px 0 5px; font-size:16px; font-weight:800; color:#1f2937; border-top:2px solid #4f46e5;">Total Amount</td><td style="padding:10px 0 5px; font-size:16px; font-weight:800; color:#1f2937; border-top:2px solid #4f46e5; text-align:right;">₱${formatCurrency(totalAmount)}</td></tr>
                        </table>

                        <div style="margin-top:22px; padding:14px 16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
                            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#6b7280; font-weight:700; margin-bottom:8px;">Terms &amp; Conditions</div>
                            <ul style="margin:0; padding-left:18px;">
                                <li style="font-size:12.5px; color:#374151; margin-bottom:4px;">50% downpayment upon confirmation, balance due upon completion/delivery.</li>
                                <li style="font-size:12.5px; color:#374151; margin-bottom:4px;">This quotation is valid for 7 days from the date issued.</li>
                                <li style="font-size:12.5px; color:#374151;">Full Replacement &amp; Warranty Terms and Conditions on page 2 of this document.</li>
                            </ul>
                        </div>

                        <table style="width:100%; margin-top:40px;">
                            <tr>
                                <td style="width:50%; text-align:center;">
                                    <div style="width:200px; border-top:1px solid #9ca3af; margin:40px auto 4px;"></div>
                                    <div style="font-size:12px; color:#374151; font-weight:600;">Authorized Signature</div>
                                    <div style="font-size:10.5px; color:#9ca3af; margin-top:2px;">${MQ_BRAND.name}</div>
                                </td>
                                <td style="width:50%; text-align:center;">
                                    <div style="width:200px; border-top:1px solid #9ca3af; margin:40px auto 4px;"></div>
                                    <div style="font-size:12px; color:#374151; font-weight:600;">Conforme (Client Signature)</div>
                                    <div style="font-size:10.5px; color:#9ca3af; margin-top:2px;">Printed Name &amp; Date</div>
                                </td>
                            </tr>
                        </table>

                        <div style="margin-top:28px; padding-top:14px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center;">
                            ${MQ_BRAND.name} — this document is a quotation only and is not a final invoice or receipt.
                        </div>
                    </div>

                    ${mqWarrantyTermsHtml()}
                </div>
            `;

            const hiddenDiv = document.createElement('div');
            hiddenDiv.innerHTML = htmlString;
            hiddenDiv.style.position = 'absolute';
            hiddenDiv.style.top = '-9999px';
            hiddenDiv.style.left = '-9999px';
            hiddenDiv.style.width = '800px';
            document.body.appendChild(hiddenDiv);

            const element = hiddenDiv.querySelector('#mq-print-wrapper');

            const opt = {
                // 0.4in margin combined with the page-break-before padding trick was
                // confirmed in testing to occasionally trigger an extra, nearly-blank
                // trailing page (a jsPDF/html2pdf page-height rounding interaction) --
                // 0.3in tested cleanly across a 1-item, 4-item, and 10-item sample with
                // no stray page.
                margin: 0.3,
                filename: `Quotation_${(quotationNumber || 'Draft').toString().replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                // 'legacy' mode adds its own height-estimation-based page break on TOP
                // of the explicit CSS break already used to separate the quotation from
                // the Terms page -- in testing this produced an extra, nearly-empty
                // trailing 3rd page. Targeting the Terms page by ID via `before` (rather
                // than relying only on the inline `page-break-before` style) gives
                // html2pdf an exact element offset to break at, which in testing removed
                // the stray trailing page that inline-style-only CSS mode still produced.
                // '.mq-avoid-break' wraps the totals/terms-note/signatures/footer block as
                // ONE unit -- without this, a longer item list (more rows) can push that
                // block right up against the page boundary and have it get sliced mid-
                // element (confirmed in testing: the footer sentence split across two
                // pages, with a stray near-blank page after it). Keeping it atomic means
                // it either fully fits after the items table, or cleanly moves as a whole
                // to the next page -- never split mid-sentence/mid-table.
                pagebreak: { mode: ['css'], before: '#mq-terms-page', avoid: ['tr', '.mq-avoid-break'] }
            };

            html2pdf().set(opt).from(element).output('bloburl').then(function (pdfUrl) {
                if (newTab) newTab.location.href = pdfUrl;
                document.body.removeChild(hiddenDiv);
                btnEl.innerHTML = originalHtml;
                btnEl.disabled = false;
            }).catch(function (error) {
                console.error('Quotation PDF generation error:', error);
                if (newTab) newTab.close();
                alert('Error generating quotation PDF.');
                document.body.removeChild(hiddenDiv);
                btnEl.innerHTML = originalHtml;
                btnEl.disabled = false;
            });
        } catch (err) {
            console.error(err);
            if (newTab) newTab.close();
            alert('Error generating quotation PDF.');
            btnEl.innerHTML = originalHtml;
            btnEl.disabled = false;
        }
    }

    const mqListTableBody = document.getElementById('manual-quotation-list-table-body');
    if (mqListTableBody) {
        mqListTableBody.addEventListener('click', (e) => {
            const printBtn = e.target.closest('.btn-mq-print-row');
            if (printBtn) {
                const idx = parseInt(printBtn.getAttribute('data-mq-row-index'), 10);
                const row = currentMqListRenderedRows[idx];
                if (row) printManualQuotationRecord(row, printBtn);
                return;
            }
            // Fix 27: "Edit" button on each row opens the same form used to create a
            // quotation, pre-filled with this record's details, per the user's request.
            const editBtn = e.target.closest('.btn-mq-edit-row');
            if (editBtn) {
                const idx = parseInt(editBtn.getAttribute('data-mq-row-index'), 10);
                const row = currentMqListRenderedRows[idx];
                if (row) mqLoadRecordIntoForm(row);
            }
        });
    }

    function applyManualQuotationListFilter() {
        const customerFilter = (document.getElementById('mq-list-customer-filter').value || '').trim().toLowerCase();
        const quotationFilter = (document.getElementById('mq-list-quotation-filter').value || '').trim().toLowerCase();
        let filtered = currentManualQuotationRecords;
        if (customerFilter) {
            filtered = filtered.filter(row => (row[2] || '').toString().toLowerCase().includes(customerFilter));
        }
        if (quotationFilter) {
            filtered = filtered.filter(row => (row[0] || '').toString().toLowerCase().includes(quotationFilter));
        }
        renderManualQuotationListTable(filtered);
    }

    async function loadManualQuotationRecords() {
        const tbody = document.getElementById('manual-quotation-list-table-body');
        const btnLoad = document.getElementById('btn-load-manual-quotations');
        const btnText = btnLoad.querySelector('.btn-text');
        const spinner = btnLoad.querySelector('.spinner');

        const startDate = document.getElementById('mq-list-start-date').value;
        const endDate = document.getElementById('mq-list-end-date').value;

        btnLoad.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'getExpenseRecords',
                    sheetName: 'Manual Quotation',
                    startDate: startDate,
                    endDate: endDate,
                    branch: 'All',
                    noCache: true
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                currentManualQuotationRecords = result.data || [];
                applyManualQuotationListFilter();
            } else {
                tbody.innerHTML = `<tr><td colspan="9" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load records'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading manual quotation records:', error);
            tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: #ef4444;">Network error. Please try again.</td></tr>';
        } finally {
            btnLoad.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    const mqBtnViewRecords = document.getElementById('mq-btn-view-records');
    if (mqBtnViewRecords) {
        mqBtnViewRecords.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('manual-quotation-list-container');
            if (container) container.classList.remove('hidden');

            // Default to last 3 weeks, same convention as every other Customer
            // Information Sheet-backed list page (gotcha #8), then load immediately
            // -- no separate "Load"/"Search" click needed to see data on open.
            const startDateEl = document.getElementById('mq-list-start-date');
            const endDateEl = document.getElementById('mq-list-end-date');
            if (startDateEl && !startDateEl.value) {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                startDateEl.value = fmt(threeWeeksAgo);
                if (endDateEl && !endDateEl.value) endDateEl.value = fmt(today);
            }

            loadManualQuotationRecords();
        });
    }

    const btnLoadManualQuotations = document.getElementById('btn-load-manual-quotations');
    if (btnLoadManualQuotations) {
        btnLoadManualQuotations.addEventListener('click', loadManualQuotationRecords);
    }

    const mqListCustomerFilter = document.getElementById('mq-list-customer-filter');
    if (mqListCustomerFilter) {
        mqListCustomerFilter.addEventListener('input', applyManualQuotationListFilter);
    }

    const mqListQuotationFilter = document.getElementById('mq-list-quotation-filter');
    if (mqListQuotationFilter) {
        mqListQuotationFilter.addEventListener('input', applyManualQuotationListFilter);
    }

    const mqBtnAddRow = document.getElementById('mq-btn-add-row');
    if (mqBtnAddRow) {
        mqBtnAddRow.addEventListener('click', () => mqAddItemRow(null));
    }

    const mqDiscountInput = document.getElementById('mq-discount');
    if (mqDiscountInput) {
        mqDiscountInput.addEventListener('input', mqRecompute);
    }

    const manualQuotationForm = document.getElementById('manual-quotation-form');
    if (manualQuotationForm) {
        manualQuotationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('mq-submit-btn');
            const statusMessage = document.getElementById('mq-status-message');

            if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
                showMessage(statusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
                return;
            }

            // Gather item rows -- only keep rows that actually have a description
            // AND a qty > 0, so a stray blank row (e.g. left over after removing
            // its contents) doesn't get saved as a phantom line item.
            const items = [];
            document.querySelectorAll('#mq-items-body tr').forEach(tr => {
                const desc = (tr.querySelector('.mq-row-desc').value || '').trim();
                const qty = parseFloat(tr.querySelector('.mq-row-qty').value) || 0;
                const amount = parseFloat(tr.querySelector('.mq-row-amount').value) || 0;
                if (desc && qty > 0) {
                    items.push({ desc: desc, qty: qty, amount: amount });
                }
            });
            if (items.length === 0) {
                showMessage(statusMessage, 'Add at least one item with a description and qty greater than 0.', 'error');
                return;
            }

            const currentUserVal = sessionStorage.getItem('loggedInUser') || '';
            // Fix 27: this form is reused both for a brand-new quotation AND for
            // editing an existing one (opened via the "Edit" button on the Manual
            // Quotation Records list). A non-empty mq-row-index means we're editing,
            // so update the existing sheet row in place instead of appending a new
            // one -- same pattern already used by Purchased Order's Fix 24.
            const mqRowIndexVal = document.getElementById('mq-row-index').value;

            let formData = {};
            if (mqRowIndexVal) {
                // updateExpenseRecord writes updatedData verbatim (no server-side
                // recompute like saveManualQuotation does for a new quotation), so
                // recompute totals from the (possibly edited) items array ourselves.
                let totalQty = 0;
                let totalBeforeDiscount = 0;
                items.forEach(it => {
                    totalQty += it.qty;
                    totalBeforeDiscount += (it.qty * it.amount);
                });
                const discountVal = parseFloat(document.getElementById('mq-discount').value) || 0;
                const totalAmountVal = Math.max(totalBeforeDiscount - discountVal, 0);
                // Quotation # and the original Encoded By are kept as-is -- same
                // "don't reassign authorship on edit" rule Fix 24b established for
                // Purchased Order's Admin Requested field.
                const quotationNumberVal = document.getElementById('mq-quotation-number').value || '';
                const originalEncodedByVal = document.getElementById('mq-original-encoded-by').value || currentUserVal;

                formData = {
                    action: 'updateExpenseRecord',
                    sheetName: 'Manual Quotation',
                    rowIndex: mqRowIndexVal,
                    updatedData: [
                        quotationNumberVal,
                        document.getElementById('mq-date').value,
                        document.getElementById('mq-customer-name').value,
                        document.getElementById('mq-company-name').value,
                        document.getElementById('mq-mobile').value,
                        document.getElementById('mq-address').value,
                        JSON.stringify(items),
                        totalQty,
                        totalBeforeDiscount,
                        discountVal,
                        totalAmountVal,
                        originalEncodedByVal
                    ],
                    encodedBy: currentUserVal
                };
            } else {
                formData = {
                    action: 'saveManualQuotation',
                    date: document.getElementById('mq-date').value,
                    customerName: document.getElementById('mq-customer-name').value,
                    companyName: document.getElementById('mq-company-name').value,
                    mobile: document.getElementById('mq-mobile').value,
                    address: document.getElementById('mq-address').value,
                    items: JSON.stringify(items),
                    discount: parseFloat(document.getElementById('mq-discount').value) || 0,
                    encodedBy: currentUserVal
                };
            }

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
                    const wasEditing = !!mqRowIndexVal;
                    const savedNumberText = result.quotationNumber ? (result.quotationNumber + ' ') : '';
                    // Fix 22: mqResetForm() hides #mq-status-message as part of its reset
                    // (so a stale message isn't left showing when the form is re-opened
                    // fresh). Must reset FIRST, then call showMessage() -- the other way
                    // around, mqResetForm() immediately re-hid the just-shown success
                    // message before it ever painted, so saves silently had no visible
                    // confirmation even though they succeeded.
                    mqResetForm();
                    if (wasEditing) {
                        showMessage(statusMessage, 'Quotation updated successfully!', 'success');
                    } else {
                        showMessage(statusMessage, 'Quotation ' + savedNumberText + 'saved successfully!', 'success');
                    }
                } else {
                    showMessage(statusMessage, (mqRowIndexVal ? 'Error updating quotation: ' : 'Error saving quotation: ') + result.message, 'error');
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

    // ======= Releasing of Build Status =======
    const RELEASING_STATUS_PAGE_SIZE = 100;
    let releasingStatusPageState = { rows: [], rendered: 0 };

    function buildReleasingStatusRowHtml(row, canAccessBuildProgress) {
        let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
        let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];
        const buildStatus = row[18] || '-';
        const partsReleasing = row[23] || 'Pending';
        let rowColor = '#ef4444'; // Pending = red
        if (partsReleasing === 'Partially Released') rowColor = '#10b981'; // green
        else if (partsReleasing === 'Item Released') rowColor = '#f1f5f9'; // white
        const isPartsPending = (partsReleasing === 'Pending');
        const actionsCell = canAccessBuildProgress
            ? (isPartsPending
                ? `<button type="button" class="btn-build-progress" disabled title="Kailangan munang i-release ang parts bago ma-progress ang build" style="background: rgba(148,163,184,0.15); color: #64748b; border: 1px solid rgba(148,163,184,0.3); border-radius: 4px; padding: 4px 8px; cursor: not-allowed; font-size: 0.85em;"><i class="fas fa-tasks"></i> Build Progress</button>`
                : `<button type="button" class="btn-build-progress" data-row-index="${row[row.length - 1]}" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;"><i class="fas fa-tasks"></i> Build Progress</button>`)
            : '<span style="color: var(--text-muted); font-size: 0.8em;">-</span>';
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: ${rowColor};">
                <td style="padding: 8px 10px;">${dateStr}</td>
                <td style="padding: 8px 10px; font-weight: 500;">${row[1] || ''}</td>
                <td style="padding: 8px 10px;">${row[2] || ''}</td>
                <td style="padding: 8px 10px;">${row[3] || ''}</td>
                <td style="padding: 8px 10px;">${row[4] || ''}</td>
                <td style="padding: 8px 10px;">${row[5] || ''}</td>
                <td style="padding: 8px 10px;">${deliveryDateStr}</td>
                <td style="padding: 8px 10px;">${row[15] || ''}</td>
                <td style="padding: 8px 10px;">${row[17] || ''}</td>
                <td style="padding: 8px 10px;">${buildStatus}</td>
                <td style="padding: 8px 10px; font-weight: 600;">${partsReleasing}</td>
                <td style="padding: 8px 10px;">${actionsCell}</td>
            </tr>
        `;
    }

    // Renders the next batch of rows into the Releasing of Build Status table and
    // appends a "Load More" row if more remain. Avoids building/attaching listeners
    // for hundreds of rows at once, which was causing scroll stutter on large result
    // sets (same underlying issue as the "View & Edit" modal table).
    function renderReleasingStatusNextBatch() {
        const tbody = document.getElementById('releasing-status-table-body');
        const existingLoadMoreRow = document.getElementById('releasing-status-load-more-row');
        if (existingLoadMoreRow) existingLoadMoreRow.remove();

        const rows = releasingStatusPageState.rows;
        const currentRole = sessionStorage.getItem('userRole');
        const canAccessBuildProgress = ['Technician', 'Manager', 'Owner', 'RMA Admin', 'Supervisor'].includes(currentRole);
        const start = releasingStatusPageState.rendered;
        const end = Math.min(start + RELEASING_STATUS_PAGE_SIZE, rows.length);
        const batch = rows.slice(start, end);

        // Use a <tbody> as the parsing context so <tr> markup parses correctly
        // (a <div> would silently drop bare <tr> elements).
        const parseWrapper = document.createElement('tbody');
        parseWrapper.innerHTML = batch.map(row => buildReleasingStatusRowHtml(row, canAccessBuildProgress)).join('');
        const newRowEls = Array.from(parseWrapper.children);
        newRowEls.forEach(tr => tbody.appendChild(tr));

        if (canAccessBuildProgress) {
            newRowEls.forEach(tr => {
                const btn = tr.querySelector('.btn-build-progress');
                if (btn) {
                    btn.addEventListener('click', () => {
                        const idx = btn.getAttribute('data-row-index');
                        const matchedRow = rows.find(r => String(r[r.length - 1]) === String(idx));
                        if (matchedRow) openBuildProgressModal(matchedRow);
                    });
                }
            });
        }

        releasingStatusPageState.rendered = end;

        if (releasingStatusPageState.rendered < rows.length) {
            const remaining = rows.length - releasingStatusPageState.rendered;
            const loadMoreTr = document.createElement('tr');
            loadMoreTr.id = 'releasing-status-load-more-row';
            const loadMoreTd = document.createElement('td');
            loadMoreTd.colSpan = 12;
            loadMoreTd.style.padding = '14px';
            loadMoreTd.style.textAlign = 'center';
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.type = 'button';
            loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Load More (${remaining} remaining)`;
            loadMoreBtn.style.cssText = 'background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 0.9em;';
            loadMoreBtn.addEventListener('click', renderReleasingStatusNextBatch);
            loadMoreTd.appendChild(loadMoreBtn);
            loadMoreTr.appendChild(loadMoreTd);
            tbody.appendChild(loadMoreTr);
        }
    }

    function renderReleasingStatusTable(rows) {
        const tbody = document.getElementById('releasing-status-table-body');
        tbody.innerHTML = '';
        releasingStatusPageState = { rows: rows || [], rendered: 0 };
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found.</td></tr>';
            return;
        }
        renderReleasingStatusNextBatch();
    }

    let currentReleasingStatusRecords = [];

    function applyReleasingStatusNameFilter() {
        const nameFilter = document.getElementById('releasing-status-search-name').value.trim().toLowerCase();
        const partsFilter = document.getElementById('releasing-status-parts-filter').value;
        let filtered = currentReleasingStatusRecords;
        // Fix 18: once a build's Build Status is already "Completed" it no longer
        // belongs on this page -- the user asked that these rows be removed
        // outright. Unconditional filter, no toggle, same pattern as Fix 11 (Item
        // Released) and Fix 17 (Deliveries list only shows Completed -- this page
        // is the inverse: it EXCLUDES Completed).
        filtered = filtered.filter(row => !(row[18] || '').toString().toLowerCase().includes('complet'));
        if (nameFilter) {
            filtered = filtered.filter(row => (row[1] || '').toString().toLowerCase().includes(nameFilter));
        }
        if (partsFilter && partsFilter !== 'All') {
            filtered = filtered.filter(row => (row[23] || 'Pending') === partsFilter);
        }
        renderReleasingStatusTable(filtered);
    }

    async function loadReleasingStatusRecords() {
        const tbody = document.getElementById('releasing-status-table-body');
        const btnLoad = document.getElementById('btn-load-releasing-status');
        const btnText = btnLoad.querySelector('.btn-text');
        const spinner = btnLoad.querySelector('.spinner');

        const startDate = document.getElementById('releasing-status-start-date').value;
        const endDate = document.getElementById('releasing-status-end-date').value;

        btnLoad.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        tbody.innerHTML = '<tr><td colspan="12" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'getExpenseRecords',
                    sheetName: 'Customer Information Sheet',
                    startDate: startDate,
                    endDate: endDate,
                    branch: 'All',
                    noCache: true
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                currentReleasingStatusRecords = result.data || [];
                applyReleasingStatusNameFilter();
            } else {
                tbody.innerHTML = `<tr><td colspan="12" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load records'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading releasing status records:', error);
            tbody.innerHTML = '<tr><td colspan="12" style="padding: 15px; text-align: center; color: #ef4444;">Network error. Please try again.</td></tr>';
        } finally {
            btnLoad.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    const menuMarvsPcReleasingBtn = document.getElementById('menu-marvspc-releasing-btn');
    if (menuMarvsPcReleasingBtn) {
        menuMarvsPcReleasingBtn.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('marvspc-releasing-container');
            if (container) container.classList.remove('hidden');

            // Default to last 3 weeks instead of the entire sheet history (2020-2099) —
            // loading everything at once was causing the same scroll stutter/hang seen
            // in the "View & Edit" modal. Users can still widen these manually to see
            // older pending items.
            const startDateEl = document.getElementById('releasing-status-start-date');
            const endDateEl = document.getElementById('releasing-status-end-date');
            if (startDateEl && !startDateEl.value) {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                startDateEl.value = fmt(threeWeeksAgo);
                if (endDateEl && !endDateEl.value) endDateEl.value = fmt(today);
            }

            loadReleasingStatusRecords();
        });
    }

    const btnLoadReleasingStatus = document.getElementById('btn-load-releasing-status');
    if (btnLoadReleasingStatus) {
        btnLoadReleasingStatus.addEventListener('click', loadReleasingStatusRecords);
    }

    const releasingStatusSearchName = document.getElementById('releasing-status-search-name');
    if (releasingStatusSearchName) {
        releasingStatusSearchName.addEventListener('input', applyReleasingStatusNameFilter);
    }

    const releasingStatusPartsFilter = document.getElementById('releasing-status-parts-filter');
    if (releasingStatusPartsFilter) {
        releasingStatusPartsFilter.addEventListener('change', applyReleasingStatusNameFilter);
    }

    // ======= Build Tracker =======
    function renderBuildTrackerTable(rows) {
        const tbody = document.getElementById('build-tracker-table-body');
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(row => {
            let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
            let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];
            const techBuilder = row[14] || '';
            const buildStatus = row[18] || '-';
            const isOngoing = techBuilder && buildStatus.toString().toLowerCase().includes('ongoing');
            const rowStyle = isOngoing ? 'border-bottom: 1px solid rgba(255,255,255,0.05); color: #10b981;' : 'border-bottom: 1px solid rgba(255,255,255,0.05);';
            return `
                <tr style="${rowStyle}">
                    <td style="padding: 8px 10px;">${dateStr}</td>
                    <td style="padding: 8px 10px; font-weight: 500;">${row[1] || ''}</td>
                    <td style="padding: 8px 10px;">${row[2] || ''}</td>
                    <td style="padding: 8px 10px;">${row[3] || ''}</td>
                    <td style="padding: 8px 10px;">${row[4] || ''}</td>
                    <td style="padding: 8px 10px;">${row[5] || ''}</td>
                    <td style="padding: 8px 10px;">${deliveryDateStr}</td>
                    <td style="padding: 8px 10px;">${techBuilder}</td>
                    <td style="padding: 8px 10px;">${row[15] || ''}</td>
                    <td style="padding: 8px 10px;">${row[17] || ''}</td>
                    <td style="padding: 8px 10px;">${buildStatus}</td>
                    <td style="padding: 8px 10px;"><button type="button" class="btn-build-tracker-update" data-row-index="${row[row.length - 1]}" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;"><i class="fas fa-pen"></i> Update</button></td>
                </tr>
            `;
        }).join('');
    }

    let currentBuildTrackerRecords = [];

    function applyBuildTrackerNameFilter() {
        const nameFilter = document.getElementById('build-tracker-search-name').value.trim().toLowerCase();
        // Only show records that already have a Tech Builder assigned (column O, index 14)
        let filtered = currentBuildTrackerRecords.filter(row => (row[14] || '').toString().trim() !== '');
        // User request: once a build's status is updated to "Completed" via the Update
        // modal below, it should drop off this list entirely -- only builds still
        // "Ongoing Build" (column S, index 18) belong here. Blank/other statuses (not
        // yet started) are excluded too, same as before this change.
        filtered = filtered.filter(row => (row[18] || '').toString().toLowerCase().includes('ongoing'));
        if (nameFilter) {
            filtered = filtered.filter(row => (row[1] || '').toString().toLowerCase().includes(nameFilter));
        }
        renderBuildTrackerTable(filtered);
    }

    async function loadBuildTrackerRecords() {
        const tbody = document.getElementById('build-tracker-table-body');
        const btnLoad = document.getElementById('btn-load-build-tracker');
        const btnText = btnLoad.querySelector('.btn-text');
        const spinner = btnLoad.querySelector('.spinner');

        const startDate = document.getElementById('build-tracker-start-date').value;
        const endDate = document.getElementById('build-tracker-end-date').value;

        btnLoad.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        tbody.innerHTML = '<tr><td colspan="12" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'getExpenseRecords',
                    sheetName: 'Customer Information Sheet',
                    startDate: startDate,
                    endDate: endDate,
                    branch: 'All',
                    noCache: true
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                currentBuildTrackerRecords = result.data || [];
                applyBuildTrackerNameFilter();
            } else {
                tbody.innerHTML = `<tr><td colspan="12" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load records'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading build tracker records:', error);
            tbody.innerHTML = '<tr><td colspan="12" style="padding: 15px; text-align: center; color: #ef4444;">Network error. Please try again.</td></tr>';
        } finally {
            btnLoad.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    const menuMarvsPcBuildTrackerBtn = document.getElementById('menu-marvspc-build-tracker-btn');
    if (menuMarvsPcBuildTrackerBtn) {
        menuMarvsPcBuildTrackerBtn.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('marvspc-build-tracker-container');
            if (container) container.classList.remove('hidden');

            // Default to last 3 weeks instead of the entire sheet history (2020-2099) —
            // same fix as the Releasing of Build Status page, for the same reason.
            const startDateEl = document.getElementById('build-tracker-start-date');
            const endDateEl = document.getElementById('build-tracker-end-date');
            if (startDateEl && !startDateEl.value) {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                startDateEl.value = fmt(threeWeeksAgo);
                if (endDateEl && !endDateEl.value) endDateEl.value = fmt(today);
            }

            loadBuildTrackerRecords();
        });
    }

    const btnLoadBuildTracker = document.getElementById('btn-load-build-tracker');
    if (btnLoadBuildTracker) {
        btnLoadBuildTracker.addEventListener('click', loadBuildTrackerRecords);
    }

    const buildTrackerSearchName = document.getElementById('build-tracker-search-name');
    if (buildTrackerSearchName) {
        buildTrackerSearchName.addEventListener('input', applyBuildTrackerNameFilter);
    }

    // ======= Build Tracker Update Modal =======
    // Lets a staff member flip a build from "Ongoing Build" to "Completed" (or back)
    // straight from the Build Tracker list. Every field except Build Status is shown
    // read-only (columns A-G, O, P, R, S -- matching exactly what the Build Tracker
    // table already displays) so this modal never accidentally overwrites anything
    // else on the Customer Information Sheet row. Reuses the existing
    // `updateExpenseRecord` backend action (already used by the Build Progress
    // modal above) -- no backend changes needed for this feature.
    let currentBuildTrackerUpdateRow = null;

    function openBuildTrackerUpdateModal(row) {
        currentBuildTrackerUpdateRow = row;

        let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
        let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];

        const fields = [
            { label: 'Date', value: dateStr || '-' },
            { label: 'Customer Name', value: row[1] || '-' },
            { label: 'Address', value: row[2] || '-' },
            { label: 'Mobile#', value: row[3] || '-' },
            { label: 'Number of Builds', value: row[4] || '-' },
            { label: 'Type of Build', value: row[5] || '-' },
            { label: 'Delivery Date', value: deliveryDateStr || '-' },
            { label: 'Tech Builder', value: row[14] || '-' },
            { label: 'Sales Admin', value: row[15] || '-' },
            { label: 'Client Request', value: row[17] || '-' }
        ];

        const body = document.getElementById('build-tracker-update-body');
        body.innerHTML = fields.map(f => `
            <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="color: var(--text-muted); font-size: 0.82em; flex-shrink: 0;">${f.label}</span>
                <span style="color: #e2e8f0; font-size: 0.85em; text-align: right; word-break: break-word;">${f.value}</span>
            </div>
        `).join('');

        const statusSelect = document.getElementById('build-tracker-update-status');
        const currentStatus = (row[18] || '').toString().toLowerCase().includes('complet') ? 'Completed' : 'Ongoing Build';
        statusSelect.value = currentStatus;

        const statusMsg = document.getElementById('build-tracker-update-status-message');
        statusMsg.classList.add('hidden');

        document.getElementById('build-tracker-update-modal').style.display = 'flex';
    }

    // Event delegation on the tbody (rows are fully re-rendered on every load/filter,
    // per-row listeners would need re-attaching every time -- one listener here
    // covers all current and future rows).
    const buildTrackerTableBody = document.getElementById('build-tracker-table-body');
    if (buildTrackerTableBody) {
        buildTrackerTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-build-tracker-update');
            if (!btn) return;
            const idx = btn.getAttribute('data-row-index');
            const matchedRow = currentBuildTrackerRecords.find(r => String(r[r.length - 1]) === String(idx));
            if (matchedRow) openBuildTrackerUpdateModal(matchedRow);
        });
    }

    const closeBuildTrackerUpdateModalBtn = document.getElementById('close-build-tracker-update-modal');
    const closeBuildTrackerUpdateBtn = document.getElementById('close-build-tracker-update-btn');
    [closeBuildTrackerUpdateModalBtn, closeBuildTrackerUpdateBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('build-tracker-update-modal').style.display = 'none';
            currentBuildTrackerUpdateRow = null;
        });
    });

    const btnSaveBuildTrackerUpdate = document.getElementById('btn-save-build-tracker-update');
    if (btnSaveBuildTrackerUpdate) {
        btnSaveBuildTrackerUpdate.addEventListener('click', async () => {
            if (!currentBuildTrackerUpdateRow) return;

            const statusMsg = document.getElementById('build-tracker-update-status-message');
            const newBuildStatus = document.getElementById('build-tracker-update-status').value;
            const encodedBy = sessionStorage.getItem('loggedInUser') || 'Unknown';
            const rowIndex = currentBuildTrackerUpdateRow[currentBuildTrackerUpdateRow.length - 1];

            btnSaveBuildTrackerUpdate.disabled = true;
            const originalHtml = btnSaveBuildTrackerUpdate.innerHTML;
            btnSaveBuildTrackerUpdate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                // Same 24-column layout as the Build Progress modal's save handler above --
                // send every column back unchanged except Build Status (index 18), so
                // nothing else on the row gets accidentally cleared or overwritten.
                const cols = ['Date', 'Customer Name', 'Address', 'Mobile#', 'Number of Builds', 'Type of Build', 'Delivery Date', 'Delivery Method', 'Shipping Fee', 'Free Shipping Justification', 'Free Shipping Screenshot URL', 'Downpayment Amount', 'Reference Number', 'DP MOP', 'Tech Builder', 'Sales Admin', 'MarvsPC Page', 'Client Request', 'Build Status', 'Payment Completion', 'Delivery Status', 'Overall Status', 'Encoded By', 'Parts Releasing'];
                const updatedData = [];
                for (let i = 0; i < cols.length; i++) {
                    if (i === 18) {
                        updatedData.push(newBuildStatus); // Build Status
                    } else {
                        updatedData.push(currentBuildTrackerUpdateRow[i] !== undefined ? currentBuildTrackerUpdateRow[i] : '');
                    }
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'updateExpenseRecord',
                        sheetName: 'Customer Information Sheet',
                        rowIndex: rowIndex,
                        updatedData: updatedData,
                        encodedBy: encodedBy
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    currentBuildTrackerUpdateRow[18] = newBuildStatus;
                    const rec = currentBuildTrackerRecords.find(r => String(r[r.length - 1]) === String(rowIndex));
                    if (rec) rec[18] = newBuildStatus;

                    // Re-apply the list filter -- a build marked "Completed" drops out of
                    // the Build Tracker list automatically, since only "Ongoing Build"
                    // rows are shown there (see applyBuildTrackerNameFilter above).
                    applyBuildTrackerNameFilter();

                    statusMsg.textContent = 'Saved successfully!';
                    statusMsg.className = 'status-message success';
                    statusMsg.classList.remove('hidden');
                    showToast('Build status updated!', 'success');

                    setTimeout(() => {
                        document.getElementById('build-tracker-update-modal').style.display = 'none';
                        currentBuildTrackerUpdateRow = null;
                    }, 700);
                } else {
                    statusMsg.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    statusMsg.className = 'status-message error';
                    statusMsg.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error saving build tracker update:', error);
                statusMsg.textContent = 'Network error. Please try again.';
                statusMsg.className = 'status-message error';
                statusMsg.classList.remove('hidden');
            } finally {
                btnSaveBuildTrackerUpdate.disabled = false;
                btnSaveBuildTrackerUpdate.innerHTML = originalHtml;
            }
        });
    }

    // ======= Build Status (read-only list view, Fix 14) =======
    // Plain view of the Customer Information Sheet, filtered to columns
    // A-G/O/P/S/U, with Date range + Build Status filters. No edit/delete/update
    // actions on purpose -- the user explicitly asked for a pure read-only list
    // here (updating Build Status itself lives on the Build Tracker page's
    // "Update" modal, Fix 13). Same generic reuse pattern as gotcha #11.
    function renderBuildStatusTable(rows) {
        const tbody = document.getElementById('build-status-table-body');
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(row => {
            let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
            let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];
            const buildStatus = row[18] || 'Pending';
            const isCompleted = buildStatus.toString().toLowerCase().includes('complet');
            const rowColor = isCompleted ? '#10b981' : (buildStatus.toString().toLowerCase().includes('ongoing') ? '#f59e0b' : 'inherit');
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: ${rowColor};">
                    <td style="padding: 8px 10px;">${dateStr}</td>
                    <td style="padding: 8px 10px; font-weight: 500;">${row[1] || ''}</td>
                    <td style="padding: 8px 10px;">${row[2] || ''}</td>
                    <td style="padding: 8px 10px;">${row[3] || ''}</td>
                    <td style="padding: 8px 10px;">${row[4] || ''}</td>
                    <td style="padding: 8px 10px;">${row[5] || ''}</td>
                    <td style="padding: 8px 10px;">${deliveryDateStr}</td>
                    <td style="padding: 8px 10px;">${row[14] || ''}</td>
                    <td style="padding: 8px 10px;">${row[15] || ''}</td>
                    <td style="padding: 8px 10px;">${buildStatus}</td>
                    <td style="padding: 8px 10px;">${row[20] || ''}</td>
                </tr>
            `;
        }).join('');
    }

    let currentBuildStatusRecords = [];

    function applyBuildStatusFilter() {
        const statusFilter = document.getElementById('build-status-filter').value;
        let filtered = currentBuildStatusRecords;
        if (statusFilter && statusFilter !== 'All') {
            if (statusFilter === 'Pending') {
                // "Pending" = Build Status is blank/not started yet, same convention
                // as the Parts Releasing filter on the Releasing of Build Status page.
                filtered = filtered.filter(row => (row[18] || '').toString().trim() === '');
            } else {
                filtered = filtered.filter(row => (row[18] || '').toString().toLowerCase() === statusFilter.toLowerCase());
            }
        }
        renderBuildStatusTable(filtered);
    }

    async function loadBuildStatusRecords() {
        const tbody = document.getElementById('build-status-table-body');
        const btnLoad = document.getElementById('btn-load-build-status');
        const btnText = btnLoad.querySelector('.btn-text');
        const spinner = btnLoad.querySelector('.spinner');

        const startDate = document.getElementById('build-status-start-date').value;
        const endDate = document.getElementById('build-status-end-date').value;

        btnLoad.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        tbody.innerHTML = '<tr><td colspan="11" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'getExpenseRecords',
                    sheetName: 'Customer Information Sheet',
                    startDate: startDate,
                    endDate: endDate,
                    branch: 'All',
                    noCache: true
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                currentBuildStatusRecords = result.data || [];
                applyBuildStatusFilter();
            } else {
                tbody.innerHTML = `<tr><td colspan="11" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load records'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading build status records:', error);
            tbody.innerHTML = '<tr><td colspan="11" style="padding: 15px; text-align: center; color: #ef4444;">Network error. Please try again.</td></tr>';
        } finally {
            btnLoad.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    const menuMarvsPcBuildStatusBtn = document.getElementById('menu-marvspc-build-status-btn');
    if (menuMarvsPcBuildStatusBtn) {
        menuMarvsPcBuildStatusBtn.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('marvspc-build-status-container');
            if (container) container.classList.remove('hidden');

            // Default to last 3 weeks, same convention as every other Customer
            // Information Sheet-backed list page (gotcha #8) -- the Build Status
            // filter itself already defaults to "Completed" via the <select>'s
            // `selected` attribute in index.html, per the user's explicit request.
            const startDateEl = document.getElementById('build-status-start-date');
            const endDateEl = document.getElementById('build-status-end-date');
            if (startDateEl && !startDateEl.value) {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                startDateEl.value = fmt(threeWeeksAgo);
                if (endDateEl && !endDateEl.value) endDateEl.value = fmt(today);
            }

            loadBuildStatusRecords();
        });
    }

    const btnLoadBuildStatus = document.getElementById('btn-load-build-status');
    if (btnLoadBuildStatus) {
        btnLoadBuildStatus.addEventListener('click', loadBuildStatusRecords);
    }

    const buildStatusFilterSelect = document.getElementById('build-status-filter');
    if (buildStatusFilterSelect) {
        buildStatusFilterSelect.addEventListener('change', applyBuildStatusFilter);
    }

    // ======= Deliveries (Fix 16) =======
    // A SEPARATE feature from "Delivery Fee" (Fix 9/15) -- this reads/writes the
    // Customer Information Sheet, NOT the "Deliveries" sheet tab (that's what
    // "Delivery Fee" logs to). Per the user's exact spec: displays columns A-J, L,
    // P, S-V; every field is read-only EXCEPT Payment Completion (T), Delivery
    // Status (U), and Overall Status (V), which are editable dropdowns inside a
    // "Modified" modal opened per row. Reuses getExpenseRecords for the list and
    // updateExpenseRecord for the save -- same "reuse, don't rebuild" pattern as
    // the Build Tracker Update modal (Fix 13, gotcha #11) -- no new backend
    // actions needed.
    function renderDeliveriesListTable(rows) {
        const tbody = document.getElementById('deliveries-list-table-body');
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="17" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found.</td></tr>';
            return;
        }
        // Fix 19: the "Modified" button is Owner-only. Every other role sees a
        // plain dash in the Actions column instead of a button at all -- same
        // convention already used by the Releasing of Build Status page's Build
        // Progress button (`canAccessBuildProgress`, ~line 334) for a role-gated
        // per-row action: when the role isn't allowed, don't render a disabled
        // button, just omit it entirely.
        const currentRole = sessionStorage.getItem('userRole');
        const canModifyDeliveries = currentRole === 'Owner';
        tbody.innerHTML = rows.map(row => {
            let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
            let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];
            const modifyBtnHtml = canModifyDeliveries
                ? `<button type="button" class="btn-deliveries-list-update" data-row-index="${row[row.length - 1]}" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;"><i class="fas fa-pen"></i> Modified</button>`
                : '';
            // Fix 29: "Print" (delivery receipt) is available to everyone who can see
            // this list, not just Owner -- unlike Modified/editing, printing a receipt
            // for a rider/customer handoff is a read-only action any staff should be
            // able to do. Explicit color keeps it readable even on a red (pending) row.
            const printBtnHtml = `<button type="button" class="btn-deliveries-list-print" data-row-index="${row[row.length - 1]}" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-left: 4px;"><i class="fas fa-print"></i> Print</button>`;
            const actionsCell = (modifyBtnHtml || printBtnHtml)
                ? `${modifyBtnHtml}${printBtnHtml}`
                : '<span style="color: var(--text-muted); font-size: 0.8em;">-</span>';
            // Fix 26 (corrected): color the whole row red as long as ANY of Payment
            // Completion, Delivery Status, or Overall Status is still "Pending" --
            // not only when all three are. A customer with Payment "Partial Payment"
            // but Delivery/Overall still "Pending" still needs attention, so it stays
            // red too; it only turns off once EVERY one of the three has moved past
            // Pending. The "Modified" button keeps its own explicit blue color
            // regardless (set via its own style="color:#3b82f6" above), so it stays
            // readable/clickable even on a red row.
            const paymentCompletion = (row[19] || 'Pending').toString().trim();
            const deliveryStatus = (row[20] || 'Pending').toString().trim();
            const overallStatus = (row[21] || 'Pending').toString().trim();
            const anyStillPending = paymentCompletion.toLowerCase() === 'pending' ||
                deliveryStatus.toLowerCase() === 'pending' ||
                overallStatus.toLowerCase() === 'pending';
            const rowStyle = `border-bottom: 1px solid rgba(255,255,255,0.05);${anyStillPending ? ' color: #ef4444;' : ''}`;
            return `
                <tr style="${rowStyle}">
                    <td style="padding: 8px 10px;">${dateStr}</td>
                    <td style="padding: 8px 10px; font-weight: 500;">${row[1] || ''}</td>
                    <td style="padding: 8px 10px;">${row[2] || ''}</td>
                    <td style="padding: 8px 10px;">${row[3] || ''}</td>
                    <td style="padding: 8px 10px;">${row[4] || ''}</td>
                    <td style="padding: 8px 10px;">${row[5] || ''}</td>
                    <td style="padding: 8px 10px;">${deliveryDateStr}</td>
                    <td style="padding: 8px 10px;">${row[7] || ''}</td>
                    <td style="padding: 8px 10px;">${row[8] || ''}</td>
                    <td style="padding: 8px 10px;">${row[9] || ''}</td>
                    <td style="padding: 8px 10px;">${row[11] || ''}</td>
                    <td style="padding: 8px 10px;">${row[15] || ''}</td>
                    <td style="padding: 8px 10px;">${row[18] || ''}</td>
                    <td style="padding: 8px 10px;">${paymentCompletion}</td>
                    <td style="padding: 8px 10px;">${deliveryStatus}</td>
                    <td style="padding: 8px 10px;">${overallStatus}</td>
                    <td style="padding: 8px 10px;">${actionsCell}</td>
                </tr>
            `;
        }).join('');
    }

    let currentDeliveriesListRecords = [];

    // Fix 17: the user asked that this list only ever show customers whose Build
    // Status (column S, index 18) is already "Completed" -- a build that hasn't
    // finished yet has no delivery/payment status worth tracking here. Everything
    // else (Pending, Ongoing Build, blank) is excluded, same "filter unconditionally,
    // no toggle" approach as Fix 11's Item Released filter.
    //
    // Fix 26: ALSO exclude rows whose Overall Status (column V, index 21) is already
    // "Completed" -- once delivery AND payment are both done, there's nothing left
    // to track here and it just clutters the list. Same unconditional-exclude
    // pattern as the Build Status filter right above (and as Fix 11's Item Released
    // filter / the Purchased Order Completed-hide filter elsewhere in the app) --
    // NOT a toggle, always hidden. Note this checks a DIFFERENT status column
    // (Overall Status, not Build Status), so a build can be "Completed" (finished
    // building, passes the filter above) while its Overall Status is still Pending
    // (still shows here) -- it only disappears once BOTH are true.
    function applyDeliveriesListFilter() {
        const filtered = currentDeliveriesListRecords
            .filter(row => (row[18] || '').toString().toLowerCase().includes('complet'))
            .filter(row => (row[21] || '').toString().trim().toLowerCase() !== 'completed');
        renderDeliveriesListTable(filtered);
    }

    async function loadDeliveriesListRecords() {
        const tbody = document.getElementById('deliveries-list-table-body');
        const btnLoad = document.getElementById('btn-load-deliveries-list');
        const btnText = btnLoad.querySelector('.btn-text');
        const spinner = btnLoad.querySelector('.spinner');

        const startDate = document.getElementById('deliveries-list-start-date').value;
        const endDate = document.getElementById('deliveries-list-end-date').value;

        btnLoad.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        tbody.innerHTML = '<tr><td colspan="17" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'getExpenseRecords',
                    sheetName: 'Customer Information Sheet',
                    startDate: startDate,
                    endDate: endDate,
                    branch: 'All',
                    noCache: true
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                currentDeliveriesListRecords = result.data || [];
                applyDeliveriesListFilter();
            } else {
                tbody.innerHTML = `<tr><td colspan="17" style="padding: 15px; text-align: center; color: #ef4444;">Error: ${result.message || 'Failed to load records'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading deliveries records:', error);
            tbody.innerHTML = '<tr><td colspan="17" style="padding: 15px; text-align: center; color: #ef4444;">Network error. Please try again.</td></tr>';
        } finally {
            btnLoad.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    const menuMarvsPcDeliveriesListBtn = document.getElementById('menu-marvspc-deliveries-list-btn');
    if (menuMarvsPcDeliveriesListBtn) {
        menuMarvsPcDeliveriesListBtn.addEventListener('click', () => {
            hideAllContainers();
            const container = document.getElementById('marvspc-deliveries-list-container');
            if (container) container.classList.remove('hidden');

            // Default to last 3 weeks, same convention as every other Customer
            // Information Sheet-backed list page (gotcha #8).
            const startDateEl = document.getElementById('deliveries-list-start-date');
            const endDateEl = document.getElementById('deliveries-list-end-date');
            if (startDateEl && !startDateEl.value) {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                startDateEl.value = fmt(threeWeeksAgo);
                if (endDateEl && !endDateEl.value) endDateEl.value = fmt(today);
            }

            loadDeliveriesListRecords();
        });
    }

    const btnLoadDeliveriesList = document.getElementById('btn-load-deliveries-list');
    if (btnLoadDeliveriesList) {
        btnLoadDeliveriesList.addEventListener('click', loadDeliveriesListRecords);
    }

    // ======= Deliveries "Modified" Update Modal =======
    let currentDeliveriesListUpdateRow = null;

    function openDeliveriesListUpdateModal(row) {
        currentDeliveriesListUpdateRow = row;

        let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
        let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];

        const fields = [
            { label: 'Date', value: dateStr || '-' },
            { label: 'Customer Name', value: row[1] || '-' },
            { label: 'Address', value: row[2] || '-' },
            { label: 'Mobile#', value: row[3] || '-' },
            { label: 'Number of Builds', value: row[4] || '-' },
            { label: 'Type of Build', value: row[5] || '-' },
            { label: 'Delivery Date', value: deliveryDateStr || '-' },
            { label: 'Delivery Method', value: row[7] || '-' },
            { label: 'Shipping Fee', value: row[8] || '-' },
            { label: 'Free Shipping Justification', value: row[9] || '-' },
            { label: 'Downpayment Amount', value: row[11] || '-' },
            { label: 'Sales Admin', value: row[15] || '-' },
            { label: 'Build Status', value: row[18] || '-' }
        ];

        const body = document.getElementById('deliveries-list-update-body');
        body.innerHTML = fields.map(f => `
            <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="color: var(--text-muted); font-size: 0.82em; flex-shrink: 0;">${f.label}</span>
                <span style="color: #e2e8f0; font-size: 0.85em; text-align: right; word-break: break-word;">${f.value}</span>
            </div>
        `).join('');

        const paymentSelect = document.getElementById('deliveries-list-update-payment');
        const deliveryStatusSelect = document.getElementById('deliveries-list-update-delivery-status');
        const overallStatusSelect = document.getElementById('deliveries-list-update-overall-status');
        paymentSelect.value = row[19] && ['Pending', 'Partial Payment', 'Full Payment'].includes(row[19]) ? row[19] : 'Pending';
        deliveryStatusSelect.value = row[20] && ['Pending', 'Walk-in', 'Delivered'].includes(row[20]) ? row[20] : 'Pending';
        overallStatusSelect.value = row[21] && ['Pending', 'Partially Completed', 'Completed'].includes(row[21]) ? row[21] : 'Pending';

        const statusMsg = document.getElementById('deliveries-list-update-status-message');
        statusMsg.classList.add('hidden');

        document.getElementById('deliveries-list-update-modal').style.display = 'flex';
    }

    // Event delegation on the tbody (rows are fully re-rendered on every load, per-row
    // listeners would need re-attaching every time -- one listener covers all rows).
    const deliveriesListTableBody = document.getElementById('deliveries-list-table-body');
    if (deliveriesListTableBody) {
        deliveriesListTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-deliveries-list-update');
            if (!btn) return;
            // Fix 19: defense-in-depth -- the button itself is only ever rendered
            // for Owner (see renderDeliveriesListTable), but re-check the role here
            // too in case the table markup is stale from before a role change.
            if (sessionStorage.getItem('userRole') !== 'Owner') return;
            const idx = btn.getAttribute('data-row-index');
            const matchedRow = currentDeliveriesListRecords.find(r => String(r[r.length - 1]) === String(idx));
            if (matchedRow) openDeliveriesListUpdateModal(matchedRow);
        });
    }

    const closeDeliveriesListUpdateModalBtn = document.getElementById('close-deliveries-list-update-modal');
    const closeDeliveriesListUpdateBtn = document.getElementById('close-deliveries-list-update-btn');
    [closeDeliveriesListUpdateModalBtn, closeDeliveriesListUpdateBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('deliveries-list-update-modal').style.display = 'none';
            currentDeliveriesListUpdateRow = null;
        });
    });

    const btnSaveDeliveriesListUpdate = document.getElementById('btn-save-deliveries-list-update');
    if (btnSaveDeliveriesListUpdate) {
        btnSaveDeliveriesListUpdate.addEventListener('click', async () => {
            if (!currentDeliveriesListUpdateRow) return;

            const statusMsg = document.getElementById('deliveries-list-update-status-message');
            const newPayment = document.getElementById('deliveries-list-update-payment').value;
            const newDeliveryStatus = document.getElementById('deliveries-list-update-delivery-status').value;
            const newOverallStatus = document.getElementById('deliveries-list-update-overall-status').value;
            const encodedBy = sessionStorage.getItem('loggedInUser') || 'Unknown';
            const rowIndex = currentDeliveriesListUpdateRow[currentDeliveriesListUpdateRow.length - 1];

            btnSaveDeliveriesListUpdate.disabled = true;
            const originalHtml = btnSaveDeliveriesListUpdate.innerHTML;
            btnSaveDeliveriesListUpdate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                // Same 24-column full-row-write pattern as the Build Tracker Update
                // modal (Fix 13) -- send every column back unchanged except Payment
                // Completion (19), Delivery Status (20), and Overall Status (21), via
                // the existing updateExpenseRecord action. No new backend action.
                const cols = ['Date', 'Customer Name', 'Address', 'Mobile#', 'Number of Builds', 'Type of Build', 'Delivery Date', 'Delivery Method', 'Shipping Fee', 'Free Shipping Justification', 'Free Shipping Screenshot URL', 'Downpayment Amount', 'Reference Number', 'DP MOP', 'Tech Builder', 'Sales Admin', 'MarvsPC Page', 'Client Request', 'Build Status', 'Payment Completion', 'Delivery Status', 'Overall Status', 'Encoded By', 'Parts Releasing'];
                const updatedData = [];
                for (let i = 0; i < cols.length; i++) {
                    if (i === 19) {
                        updatedData.push(newPayment);
                    } else if (i === 20) {
                        updatedData.push(newDeliveryStatus);
                    } else if (i === 21) {
                        updatedData.push(newOverallStatus);
                    } else {
                        updatedData.push(currentDeliveriesListUpdateRow[i] !== undefined ? currentDeliveriesListUpdateRow[i] : '');
                    }
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'updateExpenseRecord',
                        sheetName: 'Customer Information Sheet',
                        rowIndex: rowIndex,
                        updatedData: updatedData,
                        encodedBy: encodedBy
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    currentDeliveriesListUpdateRow[19] = newPayment;
                    currentDeliveriesListUpdateRow[20] = newDeliveryStatus;
                    currentDeliveriesListUpdateRow[21] = newOverallStatus;
                    const rec = currentDeliveriesListRecords.find(r => String(r[r.length - 1]) === String(rowIndex));
                    if (rec) {
                        rec[19] = newPayment;
                        rec[20] = newDeliveryStatus;
                        rec[21] = newOverallStatus;
                    }

                    applyDeliveriesListFilter();

                    statusMsg.textContent = 'Saved successfully!';
                    statusMsg.className = 'status-message success';
                    statusMsg.classList.remove('hidden');
                    showToast('Delivery info updated!', 'success');

                    setTimeout(() => {
                        document.getElementById('deliveries-list-update-modal').style.display = 'none';
                        currentDeliveriesListUpdateRow = null;
                    }, 700);
                } else {
                    statusMsg.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    statusMsg.className = 'status-message error';
                    statusMsg.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error saving deliveries list update:', error);
                statusMsg.textContent = 'Network error. Please try again.';
                statusMsg.className = 'status-message error';
                statusMsg.classList.remove('hidden');
            } finally {
                btnSaveDeliveriesListUpdate.disabled = false;
                btnSaveDeliveriesListUpdate.innerHTML = originalHtml;
            }
        });
    }

    // ======= Delivery Receipt (Fix 29) =======
    // Per-row "Print" button on the Deliveries list generates a branded delivery
    // receipt PDF -- Customer/Build/Delivery details come straight from the
    // Customer Information Sheet row (columns A-I), while Sales Invoice #,
    // Invoice Balance, Installation/Service Fee Amount, and Delivery Rider only
    // exist at print time (not stored in the sheet), so a small modal collects
    // them first. Reuses the same MQ_BRAND letterhead and html2pdf ->
    // bloburl -> pre-opened tab pattern already used by Manual Quotation's print.
    let currentDeliveryReceiptRow = null;
    // Fix 31: the most recent existing Delivery Receipts row (if any) found for
    // the currently-open modal's customer row -- used by "View / Reprint
    // Receipt" to reprint the EXACT same receipt (same number, same amounts)
    // without minting a new sequential Receipt # via logDeliveryReceipt.
    let currentExistingDeliveryReceipt = null;

    function resetDeliveryReceiptFormFields() {
        const invoiceNumEl = document.getElementById('dr-sales-invoice-number');
        if (invoiceNumEl) invoiceNumEl.value = '';
        const balanceEl = document.getElementById('dr-invoice-balance');
        if (balanceEl) balanceEl.value = '0';
        const installEl = document.getElementById('dr-installation-fee');
        if (installEl) installEl.value = '0';
        const transportEl = document.getElementById('dr-transportation-method');
        if (transportEl) transportEl.value = 'Motor';
        const riderEl = document.getElementById('dr-rider-name');
        if (riderEl) riderEl.value = '';
    }

    async function openDeliveryReceiptModal(row) {
        currentDeliveryReceiptRow = row;
        currentExistingDeliveryReceipt = null;
        const preview = document.getElementById('dr-customer-name-preview');
        if (preview) preview.textContent = row[1] || '';
        resetDeliveryReceiptFormFields();

        const loadingEl = document.getElementById('dr-loading-existing');
        const existingNoticeEl = document.getElementById('dr-existing-receipt-notice');
        const newFieldsEl = document.getElementById('dr-new-receipt-fields');
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (existingNoticeEl) existingNoticeEl.classList.add('hidden');
        if (newFieldsEl) newFieldsEl.classList.add('hidden');

        document.getElementById('delivery-receipt-modal').style.display = 'flex';

        const rowIndex = row[row.length - 1];
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'getDeliveryReceiptsForRow', rowIndex: rowIndex })
            });
            const result = await response.json();
            // Bail out if the user already closed/cancelled the modal (or opened
            // a different row) while this lookup was in flight.
            if (currentDeliveryReceiptRow !== row) return;

            if (result.status === 'success' && result.data && result.data.length > 0) {
                const latest = result.data[0];
                currentExistingDeliveryReceipt = latest;
                const numEl = document.getElementById('dr-existing-receipt-number');
                if (numEl) numEl.textContent = latest[0] || '';
                const dateEl = document.getElementById('dr-existing-receipt-date');
                if (dateEl) dateEl.textContent = latest[1] || '';
                const totalEl = document.getElementById('dr-existing-receipt-total');
                if (totalEl) totalEl.textContent = '₱' + formatCurrency(parseFloat(latest[8]) || 0);
                if (existingNoticeEl) existingNoticeEl.classList.remove('hidden');
                if (newFieldsEl) newFieldsEl.classList.add('hidden');
            } else {
                if (existingNoticeEl) existingNoticeEl.classList.add('hidden');
                if (newFieldsEl) newFieldsEl.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error checking for an existing delivery receipt:', err);
            // Network hiccup checking for an existing receipt shouldn't block
            // printing altogether -- fall back to the normal new-receipt form.
            if (existingNoticeEl) existingNoticeEl.classList.add('hidden');
            if (newFieldsEl) newFieldsEl.classList.remove('hidden');
        } finally {
            if (loadingEl) loadingEl.classList.add('hidden');
        }
    }

    const deliveriesListTableBodyForPrint = document.getElementById('deliveries-list-table-body');
    if (deliveriesListTableBodyForPrint) {
        deliveriesListTableBodyForPrint.addEventListener('click', (e) => {
            const printBtn = e.target.closest('.btn-deliveries-list-print');
            if (!printBtn) return;
            const idx = printBtn.getAttribute('data-row-index');
            const matchedRow = currentDeliveriesListRecords.find(r => String(r[r.length - 1]) === String(idx));
            if (matchedRow) openDeliveryReceiptModal(matchedRow);
        });
    }

    const closeDeliveryReceiptModalBtn = document.getElementById('close-delivery-receipt-modal');
    const cancelDeliveryReceiptModalBtn = document.getElementById('cancel-delivery-receipt-modal');
    [closeDeliveryReceiptModalBtn, cancelDeliveryReceiptModalBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('delivery-receipt-modal').style.display = 'none';
            currentDeliveryReceiptRow = null;
            currentExistingDeliveryReceipt = null;
        });
    });

    const drBtnShowNewForm = document.getElementById('dr-btn-show-new-form');
    if (drBtnShowNewForm) {
        drBtnShowNewForm.addEventListener('click', () => {
            document.getElementById('dr-existing-receipt-notice').classList.add('hidden');
            document.getElementById('dr-new-receipt-fields').classList.remove('hidden');
        });
    }

    const drBtnViewExisting = document.getElementById('dr-btn-view-existing');
    if (drBtnViewExisting) {
        drBtnViewExisting.addEventListener('click', () => {
            if (!currentExistingDeliveryReceipt || !currentDeliveryReceiptRow) return;
            // Delivery Receipts sheet columns (see logDeliveryReceipt in
            // google_apps_script.js): [0]Receipt#, [1]Date Printed,
            // [2]Customer Info Row Index, [3]Customer Name, [4]Sales Invoice #,
            // [5]Invoice Balance, [6]Shipping Fee, [7]Installation/Service Fee,
            // [8]Total Collected, [9]Transportation Method, [10]Delivery Rider,
            // [11]Printed By.
            const existing = currentExistingDeliveryReceipt;
            const row = currentDeliveryReceiptRow;
            const extra = {
                salesInvoiceNumber: existing[4] || '',
                invoiceBalance: parseFloat(existing[5]) || 0,
                installationFee: parseFloat(existing[7]) || 0,
                transportationMethod: existing[9] || '',
                riderName: existing[10] || '',
                receiptNumber: existing[0] || ''
            };
            document.getElementById('delivery-receipt-modal').style.display = 'none';
            currentDeliveryReceiptRow = null;
            currentExistingDeliveryReceipt = null;
            // No logDeliveryReceipt call here on purpose -- this is a reprint of
            // an already-logged receipt, not a new one, so no new number/row.
            generateDeliveryReceiptPdf(row, extra, drBtnViewExisting);
        });
    }

    function generateDeliveryReceiptPdf(row, extra, btnEl) {
        const originalHtml = btnEl ? btnEl.innerHTML : '';
        if (btnEl) {
            btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btnEl.disabled = true;
        }

        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.document.write('<h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating Delivery Receipt PDF...</h3>');
        } else {
            alert('Popup blocked! Please allow popups for this site to view the PDF.');
        }

        function restoreBtn() {
            if (btnEl) {
                btnEl.innerHTML = originalHtml;
                btnEl.disabled = false;
            }
        }

        try {
            // Customer Information Sheet columns A-I (row[0]-row[8]) -- see
            // saveCustomerInfo in google_apps_script.js for the authoritative order.
            const dateStr = (row[0] || '').toString().split(/[T ]/)[0];
            const customerName = row[1] || '';
            const address = row[2] || '';
            const mobile = row[3] || '';
            const numberOfBuilds = row[4] || '';
            const typeOfBuild = row[5] || '';
            const deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];
            const deliveryMethod = row[7] || '';
            const shippingFee = parseFloat(row[8]) || 0;

            const deliveryDateFormatted = deliveryDateStr ? new Date(deliveryDateStr + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
            const datePrintedFormatted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const salesInvoiceNumber = extra.salesInvoiceNumber || '';
            const invoiceBalance = extra.invoiceBalance || 0;
            const installationFee = extra.installationFee || 0;
            const transportationMethod = extra.transportationMethod || '';
            const riderName = extra.riderName || '';
            const receiptNumber = extra.receiptNumber || '';
            // Total = Invoice Balance + Shipping Fee + Installation/Service Fee Amount,
            // per the user's explicit spec (Downpayment Amount is deliberately NOT
            // part of this receipt at all).
            const totalToCollect = invoiceBalance + shippingFee + installationFee;

            const htmlString = `
                <div id="dr-print-wrapper" style="font-family: Arial, Helvetica, sans-serif; color:#111827; background:#ffffff; padding: 40px 44px; max-width: 800px; margin: 0 auto;">
                    <table style="width:100%; border-collapse:collapse; border-bottom:3px solid #4f46e5; padding-bottom:16px; margin-bottom:20px; table-layout:fixed;">
                        <tr>
                            <td style="width:60%; vertical-align:top; padding-bottom:16px;">
                                <table style="border-collapse:collapse;"><tr>
                                    <td style="width:46px; height:46px; background:#4f46e5; border-radius:10px; text-align:center; vertical-align:middle; color:#fff; font-size:22px; font-weight:700;">M</td>
                                    <td style="padding-left:12px; vertical-align:middle;">
                                        <div style="font-size:20px; font-weight:800; color:#1f2937; line-height:1.15;">${MQ_BRAND.name}</div>
                                        <div style="font-size:11.5px; color:#6b7280; margin-top:2px;">${MQ_BRAND.tagline}</div>
                                        <div style="font-size:11.5px; color:#6b7280; margin-top:5px;">📍 ${MQ_BRAND.address}</div>
                                        <div style="font-size:11.5px; color:#6b7280; margin-top:2px;">📞 ${MQ_BRAND.phone} &nbsp;|&nbsp; ✉️ ${MQ_BRAND.email}</div>
                                    </td>
                                </tr></table>
                            </td>
                            <td style="width:40%; vertical-align:top; text-align:right; padding-bottom:16px;">
                                <div style="font-size:22px; font-weight:800; color:#4f46e5; letter-spacing:1px; white-space:nowrap;">DELIVERY RECEIPT</div>
                                <div style="font-size:12.5px; color:#4f46e5; font-weight:700; margin-top:6px;">Receipt No.: ${receiptNumber || '-'}</div>
                                <div style="font-size:12.5px; color:#6b7280; margin-top:4px;">Date Printed: ${datePrintedFormatted}</div>
                            </td>
                        </tr>
                    </table>

                    <table style="width:100%; margin-bottom: 20px;">
                        <tr>
                            <td style="width: 52%; vertical-align: top;">
                                <div style="font-size:11px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px; padding-bottom:4px; border-bottom:1px solid #e5e7eb;">Customer Details</div>
                                <table style="width:100%;">
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; width:130px; vertical-align:top;">Customer Name</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${customerName}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Address</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${address}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Mobile #</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${mobile}</td></tr>
                                </table>
                            </td>
                            <td style="width: 48%; vertical-align: top;">
                                <div style="font-size:11px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px; padding-bottom:4px; border-bottom:1px solid #e5e7eb;">Build / Delivery Details</div>
                                <table style="width:100%;">
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; width:130px; vertical-align:top;">Type of Build</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${typeOfBuild}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Number of Builds</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${numberOfBuilds}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Delivery Date</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${deliveryDateFormatted}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Delivery Method</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${deliveryMethod}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Transportation Method</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${transportationMethod}</td></tr>
                                    <tr><td style="padding:4px 0; font-size:12.5px; color:#6b7280; vertical-align:top;">Delivery Rider</td><td style="padding:4px 0; font-size:12.5px; color:#1f2937; font-weight:600;">${riderName}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <div style="font-size:11px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px; padding-bottom:4px; border-bottom:1px solid #e5e7eb;">Payment Summary</div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr>
                                <th style="padding:8px 10px; font-size:10.5px; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; text-align:left; border-bottom:2px solid #e5e7eb;">Item</th>
                                <th style="padding:8px 10px; font-size:10.5px; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; text-align:right; border-bottom:2px solid #e5e7eb;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3;">Sales Invoice #</td>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3; text-align:right;">${salesInvoiceNumber || '-'}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3;">Invoice Balance</td>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3; text-align:right;">₱${formatCurrency(invoiceBalance)}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3;">Shipping Fee</td>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3; text-align:right;">₱${formatCurrency(shippingFee)}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3;">Installation/Service Fee Amount</td>
                                <td style="padding:8px 10px; font-size:12.5px; border-bottom:1px solid #f0f1f3; text-align:right;">₱${formatCurrency(installationFee)}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 10px; font-weight:800; font-size:14px; color:#4f46e5; border-top:2px solid #4f46e5;">TOTAL AMOUNT TO BE COLLECTED</td>
                                <td style="padding:8px 10px; font-weight:800; font-size:14px; color:#4f46e5; border-top:2px solid #4f46e5; text-align:right;">₱${formatCurrency(totalToCollect)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="font-size:10px; color:#9ca3af; margin-top:4px;">* Total Amount to be Collected = Invoice Balance + Shipping Fee + Installation/Service Fee Amount</div>

                    <table style="width:100%; margin-top: 40px;">
                        <tr>
                            <td style="width: 50%; padding-right: 20px; vertical-align: top;">
                                <div style="border-top:1px solid #374151; margin-top:46px; padding-top:6px; font-size:11px; color:#374151; text-align:center;">Customer Signature over Printed Name</div>
                            </td>
                            <td style="width: 50%; padding-left: 20px; vertical-align: top;">
                                <div style="border-top:1px solid #374151; margin-top:46px; padding-top:6px; font-size:11px; color:#374151; text-align:center;">Released By (Signature)<div style="margin-top:3px; color:#6b7280;">Printed Name: ${riderName || '_______________'}</div></div>
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center;">
                        This receipt confirms that the above item(s) were received in good order and condition.
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

            const element = hiddenDiv.querySelector('#dr-print-wrapper');

            const opt = {
                margin: 0.3,
                filename: `Delivery_Receipt_${(receiptNumber || 'Draft')}_${(customerName || 'Customer').toString().replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).output('bloburl').then(function (pdfUrl) {
                if (newTab) newTab.location.href = pdfUrl;
                document.body.removeChild(hiddenDiv);
                restoreBtn();
            }).catch(function (error) {
                console.error('Delivery receipt PDF generation error:', error);
                if (newTab) newTab.close();
                alert('Error generating delivery receipt PDF.');
                document.body.removeChild(hiddenDiv);
                restoreBtn();
            });
        } catch (err) {
            console.error(err);
            if (newTab) newTab.close();
            alert('Error generating delivery receipt PDF.');
            restoreBtn();
        }
    }

    const btnGenerateDeliveryReceipt = document.getElementById('btn-generate-delivery-receipt');
    if (btnGenerateDeliveryReceipt) {
        btnGenerateDeliveryReceipt.addEventListener('click', async () => {
            if (!currentDeliveryReceiptRow) return;
            const row = currentDeliveryReceiptRow;
            const extra = {
                salesInvoiceNumber: (document.getElementById('dr-sales-invoice-number').value || '').trim(),
                invoiceBalance: parseFloat(document.getElementById('dr-invoice-balance').value) || 0,
                installationFee: parseFloat(document.getElementById('dr-installation-fee').value) || 0,
                transportationMethod: document.getElementById('dr-transportation-method').value || 'Motor',
                riderName: (document.getElementById('dr-rider-name').value || '').trim()
            };
            const shippingFee = parseFloat(row[8]) || 0;
            const totalToCollect = extra.invoiceBalance + shippingFee + extra.installationFee;
            const currentUserVal = sessionStorage.getItem('loggedInUser') || '';

            // Fix 30: get a real sequential Receipt # from the backend (logged into
            // a new "Delivery Receipts" audit sheet) BEFORE generating the PDF, so
            // the printed document can show it -- same two-step "number first, then
            // render" flow Manual Quotation's Fix 21 uses for its Quotation #.
            const originalBtnHtml = btnGenerateDeliveryReceipt.innerHTML;
            btnGenerateDeliveryReceipt.disabled = true;
            btnGenerateDeliveryReceipt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'logDeliveryReceipt',
                        rowIndex: row[row.length - 1],
                        customerName: row[1] || '',
                        datePrinted: dsFormatDate(new Date()),
                        salesInvoiceNumber: extra.salesInvoiceNumber,
                        invoiceBalance: extra.invoiceBalance,
                        shippingFee: shippingFee,
                        installationFee: extra.installationFee,
                        totalCollected: totalToCollect,
                        transportationMethod: extra.transportationMethod,
                        riderName: extra.riderName,
                        encodedBy: currentUserVal
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    extra.receiptNumber = result.receiptNumber || '';
                    document.getElementById('delivery-receipt-modal').style.display = 'none';
                    currentDeliveryReceiptRow = null;
                    btnGenerateDeliveryReceipt.innerHTML = originalBtnHtml;
                    generateDeliveryReceiptPdf(row, extra, btnGenerateDeliveryReceipt);
                } else {
                    alert('Error generating receipt number: ' + result.message);
                    btnGenerateDeliveryReceipt.disabled = false;
                    btnGenerateDeliveryReceipt.innerHTML = originalBtnHtml;
                }
            } catch (err) {
                console.error('Error logging delivery receipt:', err);
                alert('Network error. Please try again.');
                btnGenerateDeliveryReceipt.disabled = false;
                btnGenerateDeliveryReceipt.innerHTML = originalBtnHtml;
            }
        });
    }

    // ======= Build Progress Modal =======
    const closeBuildProgressModalBtn = document.getElementById('close-build-progress-modal');
    const closeBuildProgressBtn = document.getElementById('close-build-progress-btn');
    [closeBuildProgressModalBtn, closeBuildProgressBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('build-progress-modal').style.display = 'none';
        });
    });

    let currentBuildProgressRow = null;

    function openBuildProgressModal(row) {
        currentBuildProgressRow = row;

        let dateStr = (row[0] || '').toString().split(/[T ]/)[0];
        let deliveryDateStr = (row[6] || '').toString().split(/[T ]/)[0];

        const fields = [
            { label: 'Date', value: dateStr || '-' },
            { label: 'Customer Name', value: row[1] || '-' },
            { label: 'Address', value: row[2] || '-' },
            { label: 'Mobile#', value: row[3] || '-' },
            { label: 'Number of Builds', value: row[4] || '-' },
            { label: 'Type of Build', value: row[5] || '-' },
            { label: 'Delivery Date', value: deliveryDateStr || '-' },
            { label: 'Sales Admin', value: row[15] || '-' },
            { label: 'Client Request', value: row[17] || '-' },
            { label: 'Build Status', value: row[18] || '-' },
            { label: 'Parts Releasing', value: row[23] || 'Pending' }
        ];

        const body = document.getElementById('build-progress-body');
        body.innerHTML = fields.map(f => `
            <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="color: var(--text-muted); font-size: 0.82em; flex-shrink: 0;">${f.label}</span>
                <span style="color: #e2e8f0; font-size: 0.85em; text-align: right; word-break: break-word;">${f.value}</span>
            </div>
        `).join('');

        const loggedInUser = sessionStorage.getItem('loggedInUser') || 'Unknown';
        const techBuilderSelect = document.getElementById('build-progress-tech-builder');
        techBuilderSelect.innerHTML = `<option value="${loggedInUser}" selected>${loggedInUser}</option>`;

        const statusMsg = document.getElementById('build-progress-status-message');
        statusMsg.classList.add('hidden');

        document.getElementById('build-progress-modal').style.display = 'flex';
    }

    const btnSaveBuildProgress = document.getElementById('btn-save-build-progress');
    if (btnSaveBuildProgress) {
        btnSaveBuildProgress.addEventListener('click', async () => {
            if (!currentBuildProgressRow) return;

            const statusMsg = document.getElementById('build-progress-status-message');
            const techBuilderName = sessionStorage.getItem('loggedInUser') || 'Unknown';
            const rowIndex = currentBuildProgressRow[currentBuildProgressRow.length - 1];

            btnSaveBuildProgress.disabled = true;
            const originalHtml = btnSaveBuildProgress.innerHTML;
            btnSaveBuildProgress.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                const cols = ['Date', 'Customer Name', 'Address', 'Mobile#', 'Number of Builds', 'Type of Build', 'Delivery Date', 'Delivery Method', 'Shipping Fee', 'Free Shipping Justification', 'Free Shipping Screenshot URL', 'Downpayment Amount', 'Reference Number', 'DP MOP', 'Tech Builder', 'Sales Admin', 'MarvsPC Page', 'Client Request', 'Build Status', 'Payment Completion', 'Delivery Status', 'Overall Status', 'Encoded By', 'Parts Releasing'];
                const updatedData = [];
                for (let i = 0; i < cols.length; i++) {
                    if (i === 14) {
                        updatedData.push(techBuilderName); // Tech Builder
                    } else if (i === 18) {
                        updatedData.push('Ongoing Build'); // Build Status
                    } else {
                        updatedData.push(currentBuildProgressRow[i] !== undefined ? currentBuildProgressRow[i] : '');
                    }
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'updateExpenseRecord',
                        sheetName: 'Customer Information Sheet',
                        rowIndex: rowIndex,
                        updatedData: updatedData,
                        encodedBy: techBuilderName
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    currentBuildProgressRow[14] = techBuilderName;
                    currentBuildProgressRow[18] = 'Ongoing Build';
                    const rec = currentReleasingStatusRecords.find(r => String(r[r.length - 1]) === String(rowIndex));
                    if (rec) {
                        rec[14] = techBuilderName;
                        rec[18] = 'Ongoing Build';
                    }
                    applyReleasingStatusNameFilter();
                    statusMsg.textContent = 'Saved successfully!';
                    statusMsg.className = 'status-message success';
                    statusMsg.classList.remove('hidden');
                    showToast('Build progress updated!', 'success');
                } else {
                    statusMsg.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    statusMsg.className = 'status-message error';
                    statusMsg.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error saving build progress:', error);
                statusMsg.textContent = 'Network error. Please try again.';
                statusMsg.className = 'status-message error';
                statusMsg.classList.remove('hidden');
            } finally {
                btnSaveBuildProgress.disabled = false;
                btnSaveBuildProgress.innerHTML = originalHtml;
            }
        });
    }

    // ======= Customer Information Sheet Logic =======
    (function() {
        const form = document.getElementById('customer-info-form');
        if (!form) return;

        // Restrict to digits (and one decimal point) only, live comma-formatting on blur
        function attachNumericFormatting(inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
                if (allowedKeys.includes(e.key)) return;
                if (e.key === '.' && !inputEl.value.includes('.')) return;
                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
            });
            inputEl.addEventListener('blur', () => {
                const raw = inputEl.value.replace(/,/g, '');
                if (raw === '' || isNaN(raw)) return;
                const num = parseFloat(raw);
                inputEl.value = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            });
            inputEl.addEventListener('focus', () => {
                // Strip commas while editing so cursor math / typing stays simple
                inputEl.value = inputEl.value.replace(/,/g, '');
            });
        }
        ['ci-num-builds', 'ci-shipping-fee', 'ci-downpayment'].forEach(id => {
            const el = document.getElementById(id);
            if (el) attachNumericFormatting(el);
        });

        // Enable/show free-shipping justification box whenever Shipping Fee = 0 (or empty), regardless of Delivery Method
        const shippingFeeInput = document.getElementById('ci-shipping-fee');
        const deliveryMethodSelect = document.getElementById('ci-delivery-method');
        const justificationBox = document.getElementById('ci-shipping-justification-box');
        const justificationTextarea = document.getElementById('ci-shipping-justification');
        const screenshotInput = document.getElementById('ci-shipping-screenshot');

        function updateJustificationVisibility() {
            const raw = shippingFeeInput.value.replace(/,/g, '').trim();
            const val = parseFloat(raw);
            const isZeroFee = raw !== '' && !isNaN(val) && val === 0;
            const method = deliveryMethodSelect.value;
            const isPickupOrBooking = (method === 'Pickup' || method === 'Customer Booking');
            const shouldEnable = isZeroFee || isPickupOrBooking;

            justificationBox.classList.toggle('hidden', !shouldEnable);
            justificationTextarea.disabled = !shouldEnable;
            screenshotInput.disabled = !shouldEnable;
            if (!shouldEnable) {
                justificationTextarea.value = '';
                screenshotInput.value = '';
            }
        }
        if (shippingFeeInput) {
            shippingFeeInput.addEventListener('input', updateJustificationVisibility);
            shippingFeeInput.addEventListener('blur', updateJustificationVisibility);
        }
        if (deliveryMethodSelect) {
            deliveryMethodSelect.addEventListener('change', updateJustificationVisibility);
        }
        updateJustificationVisibility();

        // Auto-update Delivery Status -> "For Delivery" when Build Status becomes "Completed"
        const buildStatusSelect = document.getElementById('ci-build-status');
        const deliveryStatusSelect = document.getElementById('ci-delivery-status');
        const paymentCompletionSelect = document.getElementById('ci-payment-completion');
        const overallStatusInput = document.getElementById('ci-overall-status');

        function updateOverallStatus() {
            const isBuildCompleted = buildStatusSelect.value === 'Completed';
            const isFullyPaid = paymentCompletionSelect.value === 'Fully Paid';
            const isDelivered = deliveryStatusSelect.value === 'Delivered';
            overallStatusInput.value = (isBuildCompleted && isFullyPaid && isDelivered) ? 'Completed' : 'Pending';
        }

        if (buildStatusSelect) {
            buildStatusSelect.addEventListener('change', () => {
                if (buildStatusSelect.value === 'Completed') {
                    deliveryStatusSelect.value = 'For Delivery';
                }
                updateOverallStatus();
            });
        }
        if (deliveryStatusSelect) deliveryStatusSelect.addEventListener('change', updateOverallStatus);
        if (paymentCompletionSelect) paymentCompletionSelect.addEventListener('change', updateOverallStatus);

        // Helper to convert an uploaded file to Base64 (reuses same pattern as Remitted Amount)
        function fileToBase64Local(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const statusMessage = document.getElementById('ci-status-message');
            const submitBtn = document.getElementById('btn-save-customer-info');
            const btnText = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.spinner');

            const shippingFeeRaw = document.getElementById('ci-shipping-fee').value.replace(/,/g, '').trim();
            const shippingFeeVal = parseFloat(shippingFeeRaw) || 0;
            const isExplicitZeroFee = shippingFeeRaw !== '' && !isNaN(parseFloat(shippingFeeRaw)) && parseFloat(shippingFeeRaw) === 0;
            const deliveryMethodVal = document.getElementById('ci-delivery-method').value;
            const isFreeShipping = isExplicitZeroFee || deliveryMethodVal === 'Pickup' || deliveryMethodVal === 'Customer Booking';

            if (isFreeShipping) {
                const justificationText = document.getElementById('ci-shipping-justification').value.trim();
                if (!justificationText) {
                    alert('Please provide a justification for free/₱0 shipping.');
                    document.getElementById('ci-shipping-justification').focus();
                    return;
                }
            }

            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            statusMessage.classList.add('hidden');

            try {
                let screenshotBase64 = '';
                let screenshotFileName = '';
                let screenshotMimeType = '';
                if (isFreeShipping) {
                    const fileInput = document.getElementById('ci-shipping-screenshot');
                    if (fileInput.files && fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        screenshotBase64 = await fileToBase64Local(file);
                        screenshotFileName = file.name;
                        screenshotMimeType = file.type;
                    }
                }

                const formData = {
                    action: 'saveCustomerInfo',
                    date: document.getElementById('ci-date').value,
                    customerName: document.getElementById('ci-customer-name').value,
                    address: document.getElementById('ci-address').value,
                    mobile: document.getElementById('ci-mobile').value,
                    numberOfBuilds: document.getElementById('ci-num-builds').value.replace(/,/g, ''),
                    typeOfBuild: document.getElementById('ci-type-build').value,
                    deliveryDate: document.getElementById('ci-delivery-date').value,
                    deliveryMethod: document.getElementById('ci-delivery-method').value,
                    shippingFee: shippingFeeRaw,
                    shippingJustification: isFreeShipping ? document.getElementById('ci-shipping-justification').value : '',
                    screenshotFileName: screenshotFileName,
                    screenshotMimeType: screenshotMimeType,
                    screenshotData: screenshotBase64,
                    downpayment: document.getElementById('ci-downpayment').value.replace(/,/g, ''),
                    referenceNumber: document.getElementById('ci-reference').value,
                    dpMop: document.getElementById('ci-dp-mop').value,
                    techBuilder: document.getElementById('ci-tech-builder').value,
                    clientRequest: document.getElementById('ci-client-request').value,
                    buildStatus: buildStatusSelect.value,
                    paymentCompletion: paymentCompletionSelect.value,
                    deliveryStatus: deliveryStatusSelect.value,
                    overallStatus: overallStatusInput.value,
                    salesAdmin: document.getElementById('ci-sales-admin').value,
                    marvspcPage: document.getElementById('ci-marvspc-page').value,
                    encodedBy: sessionStorage.getItem('loggedInUser')
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (result.status === 'success') {
                    statusMessage.textContent = 'Customer information saved successfully!';
                    statusMessage.className = 'status-message success';
                    statusMessage.classList.remove('hidden');
                    form.reset();
                    document.getElementById('ci-date').valueAsDate = new Date();
                    document.getElementById('ci-sales-admin').value = sessionStorage.getItem('loggedInUser') || '';
                    overallStatusInput.value = 'Pending';
                    updateJustificationVisibility();
                    showToast('Customer info saved!', 'success');
                } else {
                    statusMessage.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    statusMessage.className = 'status-message error';
                    statusMessage.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error saving customer info:', error);
                statusMessage.textContent = 'Network error. Please try again.';
                statusMessage.className = 'status-message error';
                statusMessage.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    })();

    // ======= MarvsPCStufz Drag & Drop Categorizer =======
    const btnMarvspcCategorize = document.getElementById('btn-marvspc-categorize');
    if (btnMarvspcCategorize) {
        btnMarvspcCategorize.addEventListener('click', () => {
            hideAllContainers();
            const categorizeContainer = document.getElementById('marvspc-categorize-container');
            if (categorizeContainer) categorizeContainer.classList.remove('hidden');
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            document.getElementById('categorize-start-date').valueAsDate = firstDay;
            document.getElementById('categorize-end-date').valueAsDate = now;
        });
    }

    let categorizeRecords = [];

    function createCategorizeCard(row) {
        const rowIndex = row[row.length - 1];
        let dateStr = row[0] || '';
        if (dateStr && dateStr.includes('T')) dateStr = dateStr.split('T')[0];
        const category = row[1] || '';
        const description = row[2] || '';
        const amount = parseFloat(row[3]) || 0;

        const card = document.createElement('div');
        card.className = 'categorize-card';
        card.draggable = true;
        card.dataset.rowIndex = rowIndex;
        card.style.cssText = 'background: rgba(30,41,59,0.9); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px; cursor: grab; font-size: 0.8em; max-width: 220px;';
        card.innerHTML = `
            <div style="color: var(--text-muted); font-size: 0.85em;">${dateStr}</div>
            <div style="color: #e2e8f0; font-weight: 500; margin: 2px 0; word-break: break-word;">${description || '(no description)'}</div>
            <div style="color: #10b981; font-weight: 600;">₱${formatCurrency(amount)}</div>
            ${category ? `<div style="color: #a78bfa; font-size: 0.8em; margin-top: 2px;"><i class="fas fa-tag"></i> ${category}</div>` : ''}
        `;

        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', rowIndex);
            card.style.opacity = '0.4';
        });
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });

        return card;
    }

    const btnCategorizeLoad = document.getElementById('btn-categorize-load');
    if (btnCategorizeLoad) {
        btnCategorizeLoad.addEventListener('click', async () => {
            const startDate = document.getElementById('categorize-start-date').value;
            const endDate = document.getElementById('categorize-end-date').value;
            const pool = document.getElementById('categorize-pool');

            if (!startDate || !endDate) {
                alert('Please select both Start and End Dates.');
                return;
            }

            const btnText = btnCategorizeLoad.querySelector('.btn-text');
            const spinner = btnCategorizeLoad.querySelector('.spinner');
            btnCategorizeLoad.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            document.querySelectorAll('.categorize-dropzone-items').forEach(z => z.innerHTML = '');
            pool.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85em;">Loading...</span>';

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'getExpenseRecords',
                        sheetName: 'MarvsPCStufz Expenses',
                        startDate: startDate,
                        endDate: endDate,
                        branch: 'All'
                    })
                });
                const result = await response.json();

                pool.innerHTML = '';

                if (result.status === 'success' && result.data && result.data.length > 0) {
                    categorizeRecords = result.data;
                    categorizeRecords.forEach(row => {
                        pool.appendChild(createCategorizeCard(row));
                    });
                } else {
                    pool.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85em;">No expenses found for this date range.</span>';
                }
            } catch (error) {
                console.error('Error loading categorize records:', error);
                pool.innerHTML = '<span style="color: #ef4444; font-size: 0.85em;">Error loading expenses. Please try again.</span>';
            } finally {
                btnCategorizeLoad.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    // Allow dropping back into the pool (uncategorize)
    const categorizePool = document.getElementById('categorize-pool');
    if (categorizePool) {
        categorizePool.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        categorizePool.addEventListener('drop', async (e) => {
            e.preventDefault();
            const rowIndex = e.dataTransfer.getData('text/plain');
            const card = document.querySelector(`.categorize-card[data-row-index="${rowIndex}"]`);
            if (card) categorizePool.appendChild(card);
        });
    }

    document.querySelectorAll('.categorize-dropzone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.background = 'rgba(139, 92, 246, 0.1)';
        });
        zone.addEventListener('dragleave', () => {
            zone.style.background = 'rgba(255,255,255,0.02)';
        });
        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.style.background = 'rgba(255,255,255,0.02)';

            const rowIndex = e.dataTransfer.getData('text/plain');
            const card = document.querySelector(`.categorize-card[data-row-index="${rowIndex}"]`);
            if (!card) return;

            const newCategory = zone.getAttribute('data-category');
            const record = categorizeRecords.find(r => String(r[r.length - 1]) === String(rowIndex));
            if (!record) return;

            const itemsContainer = zone.querySelector('.categorize-dropzone-items');
            itemsContainer.appendChild(card);
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';

            try {
                let dateStr = record[0] || '';
                if (dateStr && dateStr.includes('T')) dateStr = dateStr.split('T')[0];
                const updatedData = [dateStr, newCategory, record[2] || '', record[3] || '', record[4] || ''];

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'updateExpenseRecord',
                        sheetName: 'MarvsPCStufz Expenses',
                        rowIndex: rowIndex,
                        updatedData: updatedData,
                        encodedBy: sessionStorage.getItem('loggedInUser')
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    record[1] = newCategory;
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                    const catBadge = card.querySelector('div:last-child');
                    const badgeHtml = `<div style="color: #a78bfa; font-size: 0.8em; margin-top: 2px;"><i class="fas fa-tag"></i> ${newCategory}</div>`;
                    if (catBadge && catBadge.innerHTML.includes('fa-tag')) {
                        catBadge.outerHTML = badgeHtml;
                    } else {
                        card.insertAdjacentHTML('beforeend', badgeHtml);
                    }
                    showToast(`Moved to ${newCategory}`, 'success', 1800);
                } else {
                    showToast('Error saving category: ' + (result.message || 'Unknown error'), 'error');
                    categorizePool.appendChild(card);
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                }
            } catch (error) {
                console.error('Error updating category:', error);
                showToast('Network error while saving category.', 'error');
                categorizePool.appendChild(card);
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
        });
    });

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

            const fileName = file.name.toLowerCase();
            const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

            // Build items[] from a 2D array of rows (works for both CSV-parsed and Excel-parsed data)
            function buildItemsFromRows(rows) {
                const items = [];
                let startIndex = 0;
                if (rows.length > 0) {
                    const firstRowText = rows[0].join(' ').toLowerCase();
                    if (firstRowText.includes('date') || firstRowText.includes('supplier')) {
                        startIndex = 1;
                    }
                }

                for (let i = startIndex; i < rows.length; i++) {
                    const cleanRow = rows[i];
                    if (!cleanRow || cleanRow.every(v => v === '' || v === undefined || v === null)) continue;

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
                return items;
            }

            async function finishUpload(items, formatLabel) {
                try {
                    if (items.length === 0) {
                        alert(`No valid data found in ${formatLabel}.`);
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
                    console.error(`${formatLabel} parse/upload error:`, err);
                    alert(`Error parsing or uploading ${formatLabel}: ` + err.message);
                } finally {
                    btnUploadMultiplePurchased.disabled = false;
                    btnText.innerHTML = originalText;
                    purchasedCsvUpload.value = ''; // Reset input
                }
            }

            const reader = new FileReader();

            if (isExcel) {
                reader.onload = async (event) => {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = window.XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
                        const items = buildItemsFromRows(rows);
                        await finishUpload(items, 'Excel file');
                    } catch (err) {
                        console.error("Excel parse error:", err);
                        alert("Error parsing Excel file: " + err.message);
                        btnUploadMultiplePurchased.disabled = false;
                        btnText.innerHTML = originalText;
                        purchasedCsvUpload.value = '';
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = async (event) => {
                    try {
                        const text = event.target.result;
                        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                        const rows = [];

                        for (let i = 0; i < lines.length; i++) {
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
                            rows.push(cleanRow);
                        }

                        const items = buildItemsFromRows(rows);
                        await finishUpload(items, 'CSV');
                    } catch (err) {
                        console.error("CSV parse/upload error:", err);
                        alert("Error parsing or uploading CSV: " + err.message);
                        btnUploadMultiplePurchased.disabled = false;
                        btnText.innerHTML = originalText;
                        purchasedCsvUpload.value = '';
                    }
                };
                reader.readAsText(file);
            }
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
            // Default to last 3 weeks instead of the entire sheet history (2020-2099),
            // consistent with the same fix applied to the Customer Information Sheet
            // pages. Users can still widen these manually to see older pending items.
            const replStartDateEl = document.getElementById('repl-start-date');
            const replEndDateEl = document.getElementById('repl-end-date');
            if (replStartDateEl && !replStartDateEl.value) {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                replStartDateEl.value = fmt(threeWeeksAgo);
                if (replEndDateEl && !replEndDateEl.value) replEndDateEl.value = fmt(today);
            }
            const loadReplBtn = document.getElementById('btn-load-replacements');
            if (loadReplBtn) loadReplBtn.click();
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

    // AI Support Chatbot (global floating button — see showApp/showLogin for visibility toggling)
    const aiChatFab = document.getElementById('ai-chat-fab');
    const aiChatPanel = document.getElementById('ai-chat-panel');
    const aiChatCloseBtn = document.getElementById('ai-chat-close-btn');
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatMessages = document.getElementById('ai-chat-messages');
    const aiChatSendBtn = document.getElementById('ai-chat-send-btn');
    const aiChatMicBtn = document.getElementById('ai-chat-mic-btn');
    const aiChatVoiceToggleBtn = document.getElementById('ai-chat-voice-toggle-btn');
    let aiChatHistory = []; // session-only, in-memory, not persisted anywhere

    function appendAiChatMessage(text, role) {
        if (!aiChatMessages) return;
        const bubble = document.createElement('div');
        bubble.style.cssText = role === 'user'
            ? 'align-self: flex-end; background: var(--primary); color: #fff; border-radius: 10px; padding: 8px 12px; max-width: 85%; white-space: pre-wrap; word-break: break-word;'
            : 'align-self: flex-start; background: rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 12px; max-width: 85%; white-space: pre-wrap; word-break: break-word;';
        bubble.textContent = text;
        aiChatMessages.appendChild(bubble);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }

    // --- Voice OUTPUT (text-to-speech): reads the AI's replies aloud using the
    // browser's own built-in speech engine (window.speechSynthesis). No API key,
    // no extra cost, no backend involvement — this is entirely a frontend/browser
    // capability, separate from the Anthropic API key that powers the text answers.
    // Defaults OFF (toggle button in the chat header) since this is a shared,
    // multi-staff business app and unexpected audio at a shop counter would be
    // disruptive. As of Fix 10l, the CHAT TEXT can be Taglish/Tagalog/English
    // (matches the staff member, same as before Fix 10k) but the SPOKEN version is
    // always a separate, backend-generated English-only rendition of the same
    // answer (see result.replyVoice in the submit handler below) — so this picks
    // an English voice/accent for TTS, since what it's actually speaking is
    // guaranteed English regardless of what language the chat bubble shows. A
    // natural "real person" sounding voice would still require a separate, paid
    // TTS API (e.g. ElevenLabs) which was not requested.
    const ttsSupported = 'speechSynthesis' in window;
    let aiVoiceEnabled = false;

    function pickEnglishVoice() {
        if (!ttsSupported) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        // Prefer an en-US/en-PH/en-GB etc. voice; fall back to any "en" voice.
        return voices.find(v => /^en[-_]/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
    }

    function speakAiReply(text) {
        if (!ttsSupported || !aiVoiceEnabled || !text) return;
        window.speechSynthesis.cancel(); // don't let replies overlap/queue up
        const utterance = new SpeechSynthesisUtterance(text);
        const enVoice = pickEnglishVoice();
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    if (aiChatVoiceToggleBtn) {
        if (!ttsSupported) {
            aiChatVoiceToggleBtn.disabled = true;
            aiChatVoiceToggleBtn.title = 'Hindi supported ng browser mo ang text-to-speech';
            aiChatVoiceToggleBtn.style.opacity = '0.4';
        } else {
            aiChatVoiceToggleBtn.addEventListener('click', () => {
                aiVoiceEnabled = !aiVoiceEnabled;
                aiChatVoiceToggleBtn.innerHTML = aiVoiceEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
                aiChatVoiceToggleBtn.title = aiVoiceEnabled ? 'Naka-on ang pagbasa ng sagot (i-click para i-off)' : 'I-on/off ang pagbasa ng sagot (text-to-speech)';
                if (!aiVoiceEnabled) window.speechSynthesis.cancel();
            });
        }
    }

    // --- Voice INPUT (speech-to-text): lets the user talk instead of type, using
    // the browser's own built-in speech recognition (Web Speech API). Same as TTS
    // above — no API key, no extra cost, no backend involvement. Support varies by
    // browser (works in Chrome/Edge; not supported in Firefox and limited on some
    // mobile browsers) — the mic button is disabled with an explanatory title when
    // unsupported instead of silently failing. Populates the text box with the
    // transcript rather than auto-sending, so the user can double-check/edit a
    // misheard word before sending — voice recognition accuracy for Tagalog/Taglish
    // varies by device and isn't guaranteed to be perfect.
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const sttSupported = !!SpeechRecognitionCtor;
    let aiRecognition = null;
    let aiListening = false;

    if (aiChatMicBtn) {
        if (!sttSupported) {
            aiChatMicBtn.disabled = true;
            aiChatMicBtn.title = 'Hindi supported ng browser mo ang voice input';
            aiChatMicBtn.style.opacity = '0.4';
        } else {
            aiRecognition = new SpeechRecognitionCtor();
            aiRecognition.lang = 'fil-PH';
            aiRecognition.continuous = false;
            aiRecognition.interimResults = false;

            const setListeningUI = (listening) => {
                aiListening = listening;
                aiChatMicBtn.style.background = listening ? '#ef4444' : 'rgba(255,255,255,0.1)';
                aiChatMicBtn.title = listening ? 'Nakikinig... i-click para itigil' : 'Mag-mic ng tanong';
            };

            aiChatMicBtn.addEventListener('click', () => {
                if (aiListening) {
                    aiRecognition.stop();
                    return;
                }
                if (aiChatInput) aiChatInput.value = '';
                try {
                    aiRecognition.start();
                    setListeningUI(true);
                } catch (err) {
                    // start() throws if called while already running/starting; ignore.
                }
            });

            aiRecognition.onresult = (event) => {
                const transcript = event.results && event.results[0] && event.results[0][0]
                    ? event.results[0][0].transcript
                    : '';
                if (aiChatInput && transcript) {
                    aiChatInput.value = transcript;
                    aiChatInput.focus();
                }
            };
            aiRecognition.onerror = () => setListeningUI(false);
            aiRecognition.onend = () => setListeningUI(false);
        }
    }

    if (aiChatFab && aiChatPanel) {
        aiChatFab.addEventListener('click', () => {
            aiChatPanel.classList.toggle('hidden');
            if (!aiChatPanel.classList.contains('hidden') && aiChatInput) {
                aiChatInput.focus();
            } else {
                if (ttsSupported) window.speechSynthesis.cancel();
                if (aiListening && aiRecognition) aiRecognition.stop();
            }
        });
    }

    if (aiChatCloseBtn && aiChatPanel) {
        aiChatCloseBtn.addEventListener('click', () => {
            aiChatPanel.classList.add('hidden');
            if (ttsSupported) window.speechSynthesis.cancel();
            if (aiListening && aiRecognition) aiRecognition.stop();
        });
    }

    if (aiChatForm) {
        aiChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const question = aiChatInput.value.trim();
            if (!question) return;

            appendAiChatMessage(question, 'user');
            aiChatInput.value = '';
            aiChatInput.disabled = true;
            if (aiChatSendBtn) aiChatSendBtn.disabled = true;

            const thinkingBubble = document.createElement('div');
            thinkingBubble.id = 'ai-chat-thinking';
            thinkingBubble.style.cssText = 'align-self: flex-start; background: rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 12px; max-width: 85%; color: var(--text-muted); font-style: italic;';
            thinkingBubble.textContent = 'Naghahanap ng sagot...';
            aiChatMessages.appendChild(thinkingBubble);
            aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'askAiSupport',
                        message: question,
                        history: aiChatHistory.slice(-10),
                        encodedBy: sessionStorage.getItem('loggedInUser')
                    })
                });
                const result = await response.json();
                const thinkingEl = document.getElementById('ai-chat-thinking');
                if (thinkingEl) thinkingEl.remove();

                if (result.status === 'success') {
                    appendAiChatMessage(result.reply, 'assistant');
                    // Fix 10l: speak the English-only "replyVoice" rendition, not the
                    // displayed chat text (which may be Taglish/Tagalog) — falls back
                    // to result.reply if the backend didn't send a separate voice
                    // version for some reason (e.g. an older deployed backend).
                    speakAiReply(result.replyVoice || result.reply);
                    aiChatHistory.push({ role: 'user', content: question });
                    aiChatHistory.push({ role: 'assistant', content: result.reply });
                } else {
                    appendAiChatMessage('Error: ' + result.message, 'assistant');
                }
            } catch (err) {
                const thinkingEl = document.getElementById('ai-chat-thinking');
                if (thinkingEl) thinkingEl.remove();
                appendAiChatMessage('Network error. Please try again.', 'assistant');
            } finally {
                aiChatInput.disabled = false;
                if (aiChatSendBtn) aiChatSendBtn.disabled = false;
                aiChatInput.focus();
            }
        });
    }

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
                if (savedChecksTbody) savedChecksTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">No saved checks found</td></tr>';
                const container = document.getElementById('daily-sales-list-container');
                if (container) container.classList.add('hidden');
                
                // Clear and hide the monthly daily records list
                const monthlyDailyContainer = document.getElementById('monthly-daily-record-list-container');
                if (monthlyDailyContainer) monthlyDailyContainer.classList.add('hidden');
                const monthlyDailyTbody = document.querySelector('#monthly-daily-record-list-table tbody');
                if (monthlyDailyTbody) monthlyDailyTbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--text-muted);">No records loaded.</td></tr>';
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

    const purchasedOrderForm = document.getElementById('purchased-order-form');
    if (purchasedOrderForm) {
        purchasedOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('po-submit-btn');
            const statusMessage = document.getElementById('po-status-message');

            if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
                showMessage(statusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
                return;
            }

            const qtyVal = parseInt(document.getElementById('po-qty').value, 10);
            if (!qtyVal || qtyVal <= 0) {
                showMessage(statusMessage, 'Qty must be greater than 0', 'error');
                return;
            }

            // Fix 24: this form is reused both for a brand-new purchase request AND
            // for editing an existing one (opened via the "Modify/Edit" button on the
            // View & Edit Purchased Order list). A non-empty po-row-index means we're
            // editing, so update the existing sheet row in place instead of appending
            // a new one -- same pattern already used by the Warranty Items/Handover forms.
            const poRowIndexVal = document.getElementById('po-row-index').value;
            const dateRequestedVal = document.getElementById('po-date-requested').value;
            const currentUserVal = sessionStorage.getItem('loggedInUser') || '';
            // Fix 24b: "Admin Requested" identifies who ORIGINALLY made the purchase
            // request, so editing a record (e.g. just updating its Status) must not
            // silently reassign it to whoever happens to be editing. For a brand-new
            // request this field is auto-filled with the current user (see the menu
            // button handler above); for an edit it's pre-filled with the record's
            // original requester (see the Modify/Edit button handler below) and left
            // untouched here -- read it from the (disabled but still readable) field
            // itself rather than always taking the current session user.
            const adminRequestedVal = document.getElementById('po-admin-requested').value || currentUserVal;
            const itemDescriptionVal = document.getElementById('po-item-description').value;
            const statusVal = document.getElementById('po-status').value;

            let formData = {};
            if (poRowIndexVal) {
                formData = {
                    action: 'updateExpenseRecord',
                    sheetName: 'Purchased Order',
                    rowIndex: poRowIndexVal,
                    updatedData: [dateRequestedVal, adminRequestedVal, itemDescriptionVal, qtyVal, statusVal],
                    encodedBy: currentUserVal
                };
            } else {
                formData = {
                    action: 'savePurchasedOrder',
                    dateRequested: dateRequestedVal,
                    adminRequested: adminRequestedVal,
                    itemDescription: itemDescriptionVal,
                    qty: qtyVal,
                    status: statusVal,
                    encodedBy: currentUserVal
                };
            }

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
                    showMessage(statusMessage, poRowIndexVal ? 'Purchase request updated successfully!' : 'Purchase request saved successfully!', 'success');
                    purchasedOrderForm.reset();
                    document.getElementById('po-row-index').value = '';
                    document.getElementById('po-date-requested').valueAsDate = new Date();
                    document.getElementById('po-admin-requested').value = sessionStorage.getItem('loggedInUser') || '';
                    document.getElementById('po-status').value = 'Pending';
                    const poFormHeadingReset = document.getElementById('po-form-heading');
                    if (poFormHeadingReset) poFormHeadingReset.textContent = 'New Purchase Request';
                    if (btnText) btnText.textContent = 'Submit Request';
                } else {
                    showMessage(statusMessage, 'Error saving request: ' + result.message, 'error');
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

    const deliveryForm = document.getElementById('delivery-form');
    if (deliveryForm) {
        deliveryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('delivery-submit-btn');
            const statusMessage = document.getElementById('delivery-status-message');

            if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
                showMessage(statusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
                return;
            }

            const costVal = parseFloat(document.getElementById('delivery-cost').value);
            if (isNaN(costVal) || costVal < 0) {
                showMessage(statusMessage, 'Cost cannot be negative', 'error');
                return;
            }

            const formData = {
                action: 'saveDelivery',
                location: document.getElementById('delivery-location').value,
                deliveryMethod: document.getElementById('delivery-method').value,
                cost: costVal,
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
                    showMessage(statusMessage, 'Delivery fee saved successfully!', 'success');
                    deliveryForm.reset();
                    document.getElementById('delivery-method').value = 'Motor';
                } else {
                    showMessage(statusMessage, 'Error saving delivery fee: ' + result.message, 'error');
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

    // ======= Staff Schedule Generator =======
    const btnAttendanceSchedule = document.getElementById('btn-attendance-schedule');
    const attendanceScheduleModal = document.getElementById('attendanceScheduleModal');
    const closeAttendanceScheduleModalBtn = document.getElementById('close-attendance-schedule-modal-btn');
    const schedStaffCount = document.getElementById('sched-staff-count');
    const schedStaffRows = document.getElementById('sched-staff-rows');
    const btnGenerateSchedule = document.getElementById('btn-generate-schedule');
    const btnSaveSchedule = document.getElementById('btn-save-schedule');
    let lastGeneratedSchedule = null;

    if (btnAttendanceSchedule) {
        btnAttendanceSchedule.addEventListener('click', () => {
            if (attendanceScheduleModal) attendanceScheduleModal.classList.remove('hidden');
        });
    }
    if (closeAttendanceScheduleModalBtn) {
        closeAttendanceScheduleModalBtn.addEventListener('click', () => {
            if (attendanceScheduleModal) attendanceScheduleModal.classList.add('hidden');
        });
    }

    const SHIFT_TIME_OPTIONS = {
        'MGH Parang': [
            { value: '6AM-3PM', label: '6:00 AM - 3:00 PM', shortLabel: '6-3', hours: 9, minCoverage: 2 },
            { value: '2PM-11PM', label: '2:00 PM - 11:00 PM', shortLabel: '2-11', hours: 9, minCoverage: 2 },
            { value: '10PM-7AM', label: '10:00 PM - 7:00 AM', shortLabel: '10-7', hours: 9, minCoverage: 2, isNight: true }
        ],
        'MGH Concepcion': [
            { value: '6AM-6PM', label: '6:00 AM - 6:00 PM (Day)', shortLabel: '6AM-6PM', hours: 12, minCoverage: 2 },
            { value: '6PM-6AM', label: '6:00 PM - 6:00 AM (Night)', shortLabel: '6PM-6AM', hours: 12, minCoverage: 2, isNight: true }
        ],
        'MarvsPCStufz': [
            { value: '9AM-6PM', label: '9:00 AM - 6:00 PM', shortLabel: '9-6', hours: 9, minCoverage: 1 }
        ]
    };

    function renderScheduleStaffRows(count) {
        schedStaffRows.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const row = document.createElement('div');
            row.className = 'sched-staff-row';
            row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: end; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);';
            row.innerHTML = `
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.75em;">Staff ${i} Name</label>
                    <input type="text" class="sched-staff-name" placeholder="e.g. Juan Dela Cruz" style="width: 100%;">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.75em;">Branch</label>
                    <select class="sched-staff-branch" style="width: 100%;">
                        <option value="MGH Parang">MGH Parang</option>
                        <option value="MGH Concepcion">MGH Concepcion</option>
                        <option value="MarvsPCStufz">MarvsPCStufz</option>
                    </select>
                </div>
            `;
            schedStaffRows.appendChild(row);
        }
    }

    if (schedStaffCount) {
        schedStaffCount.addEventListener('change', () => {
            const count = parseInt(schedStaffCount.value) || 0;
            renderScheduleStaffRows(count);
            btnSaveSchedule.classList.add('hidden');
            document.getElementById('sched-preview-container').innerHTML = '';
            document.getElementById('sched-warnings').innerHTML = '';
        });
    }

    function generateStaffSchedule(staffList, startDate, endDate, rotationPeriodWeeks) {
        // Group staff by branch
        const branchGroups = {};
        staffList.forEach(s => {
            if (!branchGroups[s.branch]) branchGroups[s.branch] = [];
            branchGroups[s.branch].push(s);
        });

        // Build list of dates
        const dates = [];
        let cur = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        while (cur <= end) {
            dates.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        const totalWeeks = Math.ceil(dates.length / 7);
        const totalCycles = Math.max(1, Math.ceil(totalWeeks / rotationPeriodWeeks));

        const warnings = [];
        const cellsByStaff = new Map();
        staffList.forEach(s => cellsByStaff.set(s, dates.map(() => ({ status: 'Day Off', shift: null }))));

        // For each branch, for each rotation cycle (period of 1-2 weeks), assign staff into
        // shift-groups sized as (minCoverage + 1 buffer) so that even when one member of a
        // group takes their weekly day-off, the minimum required headcount still remains on duty.
        Object.keys(branchGroups).forEach(branchName => {
            const branchStaff = branchGroups[branchName];
            const shifts = SHIFT_TIME_OPTIONS[branchName] || [];

            if (branchName === 'MarvsPCStufz') {
                // Fixed pattern: Monday-Saturday, everyone off Sunday, single shift
                branchStaff.forEach(s => {
                    const cells = cellsByStaff.get(s);
                    dates.forEach((d, di) => {
                        if (d.getDay() === 0) return; // stays Day Off (Sunday)
                        cells[di] = { status: 'Duty', shift: shifts[0] || null };
                    });
                });
                return;
            }

            for (let cycle = 0; cycle < totalCycles; cycle++) {
                // Rotate the staff order each cycle so everyone eventually cycles through every shift
                const order = branchStaff.slice();
                const rot = cycle % order.length;
                const rotatedOrder = order.slice(rot).concat(order.slice(0, rot));

                const cycleStartDay = cycle * rotationPeriodWeeks * 7;
                const cycleEndDay = Math.min(cycleStartDay + rotationPeriodWeeks * 7, dates.length);
                const totalBranchStaff = rotatedOrder.length;
                let globalIdx = 0;

                // Step 1: assign PRIMARY staff to each shift, sized exactly at minCoverage.
                // Leftover staff beyond what all shifts need become FLOATERS shared across shifts.
                let pointer = 0;
                const primaryGroups = []; // { shiftDef, members: [{staff, offRelDays}] }
                shifts.forEach(shiftDef => {
                    const need = shiftDef.minCoverage || 1;
                    const groupSize = Math.min(need, rotatedOrder.length - pointer);
                    const group = rotatedOrder.slice(pointer, pointer + groupSize);
                    pointer += groupSize;

                    if (groupSize < need) {
                        warnings.push(`${branchName} (${shiftDef.label}): kulang ang staff, ${groupSize}/${need} lang ang naka-assign sa cycle simula ${dates[cycleStartDay] ? dates[cycleStartDay].toISOString().split('T')[0] : ''}`);
                    }

                    const members = group.map(s => {
                        const offCount = 7 - s.workDays;
                        const offsetRelDay = totalBranchStaff > 0 ? Math.round((globalIdx * 7) / totalBranchStaff) : 0;
                        globalIdx++;
                        const offRelDays = [];
                        for (let j = 0; j < offCount; j++) offRelDays.push((offsetRelDay + j) % 7);
                        return { staff: s, offRelDays };
                    });
                    primaryGroups.push({ shiftDef, members });
                });

                const floaters = rotatedOrder.slice(pointer).map((s, idx) => {
                    const offCount = 7 - s.workDays;
                    const offsetRelDay = totalBranchStaff > 0 ? Math.round((globalIdx * 7) / totalBranchStaff) : 0;
                    globalIdx++;
                    const offRelDays = [];
                    for (let j = 0; j < offCount; j++) offRelDays.push((offsetRelDay + j) % 7);
                    return { staff: s, offRelDays, defaultShiftIndex: idx % shifts.length };
                });

                // Step 2: day-by-day, mark primary members Duty/Off, then use available floaters
                // to patch any shift that falls below its target that day.
                for (let di = cycleStartDay; di < cycleEndDay; di++) {
                    const relDay = (di - cycleStartDay) % 7;
                    const shiftOnDutyCount = new Map();

                    primaryGroups.forEach(pg => {
                        let onDuty = 0;
                        pg.members.forEach(m => {
                            const cells = cellsByStaff.get(m.staff);
                            if (m.offRelDays.includes(relDay)) {
                                cells[di] = { status: 'Day Off', shift: null };
                            } else {
                                cells[di] = { status: 'Duty', shift: pg.shiftDef };
                                onDuty++;
                            }
                        });
                        shiftOnDutyCount.set(pg.shiftDef, onDuty);
                    });

                    // Available floaters today = not on their own day off
                    const availableFloaters = floaters.filter(f => !f.offRelDays.includes(relDay));
                    const usedFloaters = new Set();

                    // Fill shortfalls first (highest-priority: shifts furthest below target)
                    const deficits = primaryGroups
                        .map(pg => ({ pg, deficit: (pg.shiftDef.minCoverage || 1) - (shiftOnDutyCount.get(pg.shiftDef) || 0) }))
                        .filter(d => d.deficit > 0)
                        .sort((a, b) => b.deficit - a.deficit);

                    deficits.forEach(({ pg, deficit }) => {
                        for (let n = 0; n < deficit; n++) {
                            const floater = availableFloaters.find(f => !usedFloaters.has(f.staff));
                            if (!floater) return;
                            usedFloaters.add(floater.staff);
                            cellsByStaff.get(floater.staff)[di] = { status: 'Duty', shift: pg.shiftDef };
                        }
                    });

                    // Remaining floaters (not needed to patch a gap): assign their default shift,
                    // or mark as day off if it's their own off-day.
                    floaters.forEach(f => {
                        if (usedFloaters.has(f.staff)) return;
                        const cells = cellsByStaff.get(f.staff);
                        if (f.offRelDays.includes(relDay)) {
                            cells[di] = { status: 'Day Off', shift: null };
                        } else {
                            cells[di] = { status: 'Duty', shift: shifts[f.defaultShiftIndex] || null };
                        }
                    });
                }
            }
        });

        const schedule = staffList.map(s => ({ staff: s, cells: cellsByStaff.get(s) }));

        // Final verification pass: check actual per-day coverage against target (in case of edge cases)
        dates.forEach((d, di) => {
            const dStr = d.toISOString().split('T')[0];
            Object.keys(branchGroups).forEach(branchName => {
                const shifts = SHIFT_TIME_OPTIONS[branchName] || [];
                const staffInBranch = schedule.filter(row => row.staff.branch === branchName);
                if (staffInBranch.length === 0) return;
                shifts.forEach(shiftDef => {
                    const onDutyCount = staffInBranch.filter(row => row.cells[di].status === 'Duty' && row.cells[di].shift && row.cells[di].shift.value === shiftDef.value).length;
                    const required = shiftDef.minCoverage || 1;
                    if (onDutyCount === 0) {
                        warnings.push(`${branchName} (${shiftDef.label}): walang staff na naka-duty sa ${dStr}`);
                    } else if (onDutyCount < required) {
                        warnings.push(`${branchName} (${shiftDef.label}): ${onDutyCount} lang staff naka-duty sa ${dStr}, target ay ${required}`);
                    }
                });
            });
        });

        return { dates, schedule, warnings };
    }

    if (btnGenerateSchedule) {
        btnGenerateSchedule.addEventListener('click', () => {
            const startDate = document.getElementById('sched-start-date').value;
            const endDate = document.getElementById('sched-end-date').value;

            if (!startDate || !endDate) {
                alert('Please select both Date From and Date To.');
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                alert('Date From cannot be later than Date To.');
                return;
            }

            const nameInputs = document.querySelectorAll('.sched-staff-name');
            if (nameInputs.length === 0) {
                alert('Please select Number of Staff first.');
                return;
            }

            const staffList = [];
            let hasEmptyName = false;
            document.querySelectorAll('.sched-staff-row').forEach(row => {
                const name = row.querySelector('.sched-staff-name').value.trim();
                const branch = row.querySelector('.sched-staff-branch').value;
                const workDays = 6; // fixed: 6 working days, 1 day off per week for all staff
                if (!name) hasEmptyName = true;
                staffList.push({ name: name || '(Unnamed)', branch, workDays });
            });

            if (hasEmptyName) {
                if (!confirm('May mga staff na walang pangalan. Ituloy pa rin ba?')) return;
            }

            const rotationPeriodWeeks = parseInt(document.getElementById('sched-rotation-period').value) || 2;
            const result = generateStaffSchedule(staffList, startDate, endDate, rotationPeriodWeeks);
            lastGeneratedSchedule = { ...result, startDate, endDate };

            // Render warnings
            const warningsEl = document.getElementById('sched-warnings');
            if (result.warnings.length > 0) {
                warningsEl.innerHTML = `
                    <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 10px 14px; color: #fca5a5; font-size: 0.85em;">
                        <strong><i class="fas fa-triangle-exclamation"></i> Walang Coverage Warning:</strong>
                        <ul style="margin: 6px 0 0 18px; padding: 0;">
                            ${result.warnings.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } else {
                warningsEl.innerHTML = `<div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 8px 14px; color: #6ee7b7; font-size: 0.85em;"><i class="fas fa-check-circle"></i> May staff na naka-duty araw-araw sa bawat branch.</div>`;
            }

            // Render preview table
            const previewContainer = document.getElementById('sched-preview-container');
            let tableHtml = '<table style="border-collapse: collapse; font-size: 0.78em; min-width: 100%;"><thead><tr>';
            tableHtml += '<th style="padding: 8px; text-align: left; position: sticky; left: 0; background: var(--bg-dark); border-bottom: 1px solid var(--glass-border);">Staff</th>';
            tableHtml += '<th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--glass-border);">Branch</th>';
            result.dates.forEach(d => {
                const label = `${d.getMonth() + 1}/${d.getDate()}`;
                tableHtml += `<th style="padding: 6px; text-align: center; border-bottom: 1px solid var(--glass-border); min-width: 55px;">${label}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            result.schedule.forEach(row => {
                tableHtml += '<tr>';
                tableHtml += `<td style="padding: 8px; font-weight: 500; position: sticky; left: 0; background: var(--bg-dark); border-bottom: 1px solid rgba(255,255,255,0.05);">${row.staff.name}</td>`;
                tableHtml += `<td style="padding: 8px; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.05);">${row.staff.branch}</td>`;
                row.cells.forEach(cell => {
                    const isDuty = cell.status === 'Duty';
                    const cellText = isDuty ? (cell.shift ? cell.shift.shortLabel : 'Duty') : 'Off';
                    const cellTitle = isDuty && cell.shift ? cell.shift.label : 'Day Off';
                    tableHtml += `<td title="${cellTitle}" style="padding: 6px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${isDuty ? '#10b981' : '#64748b'}; font-weight: ${isDuty ? '600' : '400'};">${cellText}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            previewContainer.innerHTML = tableHtml;

            btnSaveSchedule.classList.remove('hidden');
        });
    }

    if (btnSaveSchedule) {
        btnSaveSchedule.addEventListener('click', async () => {
            if (!lastGeneratedSchedule) return;

            const btnText = btnSaveSchedule.querySelector('.btn-text');
            const spinner = btnSaveSchedule.querySelector('.spinner');
            btnSaveSchedule.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            try {
                const rows = [];
                lastGeneratedSchedule.schedule.forEach(row => {
                    lastGeneratedSchedule.dates.forEach((d, di) => {
                        const cell = row.cells[di];
                        rows.push({
                            date: d.toISOString().split('T')[0],
                            branch: row.staff.branch,
                            staffName: row.staff.name,
                            shiftTime: cell.shift ? cell.shift.label : '',
                            shiftHours: cell.shift ? cell.shift.hours : '',
                            status: cell.status
                        });
                    });
                });

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'saveStaffSchedule',
                        rows: rows,
                        encodedBy: sessionStorage.getItem('loggedInUser')
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Schedule saved successfully!', 'success');
                } else {
                    showToast('Error saving schedule: ' + (result.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error saving schedule:', error);
                showToast('Network error while saving schedule.', 'error');
            } finally {
                btnSaveSchedule.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
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

    // --- DETAILED ANALYTICS MODULE ---
    const btnGenerateAnalytics = document.getElementById('btn-generate-analytics');
    if (btnGenerateAnalytics) {
        btnGenerateAnalytics.addEventListener('click', async () => {
            const startDate = document.getElementById('analytics-start-date').value;
            const endDate = document.getElementById('analytics-end-date').value;
            const branch = document.getElementById('analytics-branch').value;

            if (!startDate || !endDate) {
                alert("Please select both Start and End Dates.");
                return;
            }

            const btnText = btnGenerateAnalytics.querySelector('.btn-text');
            const spinner = btnGenerateAnalytics.querySelector('.spinner');

            btnGenerateAnalytics.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');

            try {
                const [cashRes, gcashRes, recvRes, cohRes, surveyRes] = await Promise.all([
                    fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getReportData', reportType: 'Cash Expense', startDate, endDate, branch }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getReportData', reportType: 'Gcash Expense', startDate, endDate, branch }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getReportData', reportType: 'Gcash Receivable', startDate, endDate, branch }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getReportData', reportType: 'Cash on Hand', startDate, endDate, branch }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getExpenseRecords', sheetName: 'Daily Survey', startDate, endDate, branch }) }).then(r => r.json())
                ]);

                if (cashRes.status === 'success' && gcashRes.status === 'success' && recvRes.status === 'success' && cohRes.status === 'success' && surveyRes.status === 'success') {
                    function normalizeExpenseRows(rows, dateIdx, branchIdx, amountIdx, categoryIdx, paymentIdx) {
                        return rows.map(row => {
                            let dateVal = row[dateIdx] || '';
                            let dateStr = '';
                            if (dateVal) {
                                const d = new Date(dateVal);
                                dateStr = !isNaN(d) ? d.toISOString().split('T')[0] : String(dateVal).split('T')[0];
                            }
                            return {
                                date: dateStr,
                                branch: row[branchIdx] || 'Unknown',
                                amount: parseFloat((row[amountIdx] || 0).toString().replace(/[^0-9.-]+/g, '')) || 0,
                                category: categoryIdx > -1 ? (row[categoryIdx] || 'Uncategorized') : 'Uncategorized',
                                payment: paymentIdx > -1 ? (row[paymentIdx] || 'Unknown') : 'Cash'
                            };
                        });
                    }

                    // Expenses = money going out (Cash Expenses + Gcash Expenses)
                    const combinedExpenses = [
                        ...normalizeExpenseRows(cashRes.data || [], 1, 0, 3, 2, -1),
                        ...normalizeExpenseRows(gcashRes.data || [], 1, 0, 4, 2, 3)
                    ];

                    // Income = money coming in from customers (Gcash Receivable + Cash on Hand)
                    const combinedIncome = [
                        ...normalizeExpenseRows(recvRes.data || [], 1, 0, 6, 2, 4),
                        ...normalizeExpenseRows(cohRes.data || [], 1, 0, 2, -1, -1)
                    ];

                    let surveyData = surveyRes.data || [];
                    if (branch && branch !== 'All') {
                        surveyData = surveyData.filter(row => row[1] === branch);
                    }

                    renderAnalyticsDashboard(combinedExpenses, combinedIncome, surveyData);
                } else {
                    alert('Error fetching analytics data.');
                }
            } catch (err) {
                console.error(err);
                alert('Network error while generating analytics.');
            } finally {
                btnGenerateAnalytics.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
            }
        });
    }

    function renderAnalyticsDashboard(expenses, income, survey) {
        document.getElementById('analytics-results-container').classList.remove('hidden');

        let totalExpenses = 0;
        let totalTransactions = 0;
        let totalIncome = 0;
        const trendData = {};
        const branchData = {};
        const aggExpenses = { category: {}, payment: {} };

        expenses.forEach(row => {
            const date = row.date;
            const b = row.branch;
            const cost = row.amount;
            const cat = row.category;
            const pay = row.payment;

            if (date) {
                totalExpenses += cost;
                totalTransactions++;

                if (!trendData[date]) trendData[date] = { expenses: 0, traffic: 0 };
                trendData[date].expenses += cost;

                if (!branchData[b]) branchData[b] = { expenses: 0, income: 0, traffic: 0, trans: 0 };
                branchData[b].expenses += cost;
                branchData[b].trans++;

                aggExpenses.category[cat] = (aggExpenses.category[cat] || 0) + cost;
                aggExpenses.payment[pay] = (aggExpenses.payment[pay] || 0) + cost;
            }
        });

        income.forEach(row => {
            const date = row.date;
            const b = row.branch;
            const amt = row.amount;

            if (date) {
                totalIncome += amt;
                if (!branchData[b]) branchData[b] = { expenses: 0, income: 0, traffic: 0, trans: 0 };
                branchData[b].income += amt;
            }
        });

        let totalTraffic = 0;
        let peakTrafficCount = -1;
        let peakTrafficDay = '-';

        survey.forEach(row => {
            let date = '';
            if (row[0]) {
                const dObj = new Date(row[0]);
                date = !isNaN(dObj) ? dObj.toISOString().split('T')[0] : String(row[0]).split('T')[0];
            }
            const b = row[1] || 'Unknown';
            const count = parseInt(row[3]) || 0;

            if (date) {
                totalTraffic += count;
                if (!trendData[date]) trendData[date] = { expenses: 0, traffic: 0 };
                trendData[date].traffic += count;

                if (!branchData[b]) branchData[b] = { expenses: 0, income: 0, traffic: 0, trans: 0 };
                branchData[b].traffic += count;
            }
        });

        const uniqueDays = Object.keys(trendData).length;
        const avgDailyTraffic = uniqueDays > 0 ? Math.round(totalTraffic / uniqueDays) : 0;
        const avgTransaction = totalTransactions > 0 ? totalExpenses / totalTransactions : 0;

        for (const [date, data] of Object.entries(trendData)) {
            if (data.traffic > peakTrafficCount) {
                peakTrafficCount = data.traffic;
                peakTrafficDay = date;
            }
        }

        document.getElementById('analytics-kpi-total-expenses').textContent = `₱${formatCurrency(totalExpenses)}`;
        document.getElementById('analytics-kpi-total-income').textContent = `₱${formatCurrency(totalIncome)}`;
        document.getElementById('analytics-kpi-net-cashflow').textContent = `₱${formatCurrency(totalIncome - totalExpenses)}`;
        document.getElementById('analytics-kpi-total-transactions').textContent = totalTransactions.toLocaleString();
        document.getElementById('analytics-kpi-avg-transaction').textContent = `₱${formatCurrency(avgTransaction)}`;
        document.getElementById('analytics-kpi-total-traffic').textContent = totalTraffic.toLocaleString();
        document.getElementById('analytics-kpi-avg-daily-traffic').textContent = avgDailyTraffic.toLocaleString();
        document.getElementById('analytics-kpi-peak-traffic').textContent = peakTrafficCount >= 0 ? `${peakTrafficDay} (${peakTrafficCount})` : '-';

        const top5List = document.getElementById('analytics-top5-traffic-list');
        if (top5List) {
            const sortedByTraffic = Object.entries(trendData)
                .map(([date, data]) => ({ date, traffic: data.traffic }))
                .sort((a, b) => b.traffic - a.traffic)
                .slice(0, 3);

            if (sortedByTraffic.length === 0) {
                top5List.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85em; text-align: center;">No data</span>`;
            } else {
                top5List.innerHTML = sortedByTraffic.map((item, i) => `
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                        <span style="display: flex; align-items: center; gap: 6px; font-size: 0.85em; flex-wrap: wrap; min-width: 0;">
                            <span style="flex-shrink: 0; background: #10b981; color: #0f172a; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75em; font-weight: 700;">${i + 1}</span>
                            <span style="word-break: break-word;">${item.date}</span>
                        </span>
                        <span style="color: #10b981; font-weight: 600; font-size: 0.85em; flex-shrink: 0;">${item.traffic.toLocaleString()}</span>
                    </div>
                `).join('');
            }
        }

        if (chartInstances['analytics-trend-chart']) chartInstances['analytics-trend-chart'].destroy();
        const sortedDates = Object.keys(trendData).sort();
        const expensesLine = sortedDates.map(d => trendData[d].expenses);
        const trafficLine = sortedDates.map(d => trendData[d].traffic);

        const ctxTrend = document.getElementById('analytics-trend-chart');
        if (ctxTrend) {
            chartInstances['analytics-trend-chart'] = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [
                        { label: 'Total Expenses (₱)', data: expensesLine, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', yAxisID: 'y', tension: 0.3, fill: true },
                        { label: 'Customer Traffic', data: trafficLine, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', yAxisID: 'y1', tension: 0.3, fill: true }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#e2e8f0' } },
                        title: { display: true, color: '#e2e8f0', text: 'Expenses vs Customer Traffic Trend' }
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                        y: { type: 'linear', display: true, position: 'left', ticks: { color: '#ef4444', callback: val => '₱' + val }, grid: { color: 'rgba(255,255,255,0.06)' } },
                        y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#10b981' }, grid: { drawOnChartArea: false } }
                    }
                }
            });
        }

        const sortedCategory = Object.entries(aggExpenses.category).sort((a,b)=>b[1]-a[1]);
        const finalCategory = {};
        sortedCategory.forEach(([k,v]) => finalCategory[k] = v);

        const analyticsBaseOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#e2e8f0', padding: 12, boxWidth: 12, font: { size: 11 } } },
                title: { display: true, color: '#e2e8f0', font: { size: 13, weight: '600' } }
            }
        };

        const ctxAC = document.getElementById('analytics-category-chart');
        if (ctxAC) {
            if (chartInstances['analytics-category-chart']) chartInstances['analytics-category-chart'].destroy();
            chartInstances['analytics-category-chart'] = new Chart(ctxAC, {
                type: 'doughnut',
                data: { labels: Object.keys(finalCategory).slice(0,8), datasets: [{ data: Object.values(finalCategory).slice(0,8), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#6366f1'], borderWidth: 0 }] },
                options: {...analyticsBaseOpts, cutout: '65%', plugins: {...analyticsBaseOpts.plugins, title: {...analyticsBaseOpts.plugins.title, text: 'By Category (Top 8)' } } }
            });
        }

        const ctxAP = document.getElementById('analytics-payment-chart');
        if (ctxAP) {
            if (chartInstances['analytics-payment-chart']) chartInstances['analytics-payment-chart'].destroy();
            chartInstances['analytics-payment-chart'] = new Chart(ctxAP, {
                type: 'pie',
                data: { labels: Object.keys(aggExpenses.payment), datasets: [{ data: Object.values(aggExpenses.payment), backgroundColor: ['#10b981','#3b82f6','#f59e0b'], borderWidth: 0 }] },
                options: {...analyticsBaseOpts, plugins: {...analyticsBaseOpts.plugins, title: {...analyticsBaseOpts.plugins.title, text: 'By Payment Method' } } }
            });
        }

        const tbody = document.getElementById('analytics-branch-table-body');
        tbody.innerHTML = '';
        if (Object.keys(branchData).length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">No data for selected period</td></tr>`;
        } else {
            for (const [branchName, data] of Object.entries(branchData)) {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight: 500;">${branchName}</td>
                    <td style="padding: 12px; text-align: right; color: #ef4444;">₱${formatCurrency(data.expenses)}</td>
                    <td style="padding: 12px; text-align: right; color: #10b981;">₱${formatCurrency(data.income)}</td>
                    <td style="padding: 12px; text-align: right; color: #3b82f6;">${data.traffic.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            }
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
                    rowsHtml = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: #9ca3af; font-family: Arial, Helvetica, sans-serif;">No saved Daily Records found for the selected date range and branch.</td></tr>';
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
            tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--text-muted);">No saved Daily Records found for the selected date range and branch.</td></tr>';
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
                        tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--text-muted);">No saved Daily Checks found for the selected date and branch.</td></tr>';
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
            tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Generating report...</td></tr>';
            
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
                        tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--text-muted);">No attendance records found for this period.</td></tr>';
                    } else {
                        tbody.innerHTML = '';
                        filtered.forEach(row => {
                            const dateStr = row[1] ? new Date(row[1]).toISOString().split('T')[0] : '';
                            const emp = row[2] || '';
                            const b = row[3] || '';
                            const tIn = row[4] || '';
                            const tOut = row[5] || '';
                            
                            let calcHrs = row[6] || '';
                            const status = row[7] || '';
                            const ot = row[8] || '0';
                            let calcLate = row[9] || '0'; // col 9 is Late
                            
                            // Dynamically recalculate Hours and Late based on 9AM rule for Report View
                            if (tIn && tOut) {
                                const parseTime = (timeStr) => {
                                    const parts = timeStr.split(':');
                                    if (parts.length >= 2) {
                                        const d = new Date();
                                        d.setHours(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2] || 0), 0);
                                        return d;
                                    }
                                    return null;
                                };

                                const inDate = parseTime(tIn);
                                const outDate = parseTime(tOut);
                                
                                if (inDate && outDate) {
                                    const nineAM = new Date(inDate);
                                    nineAM.setHours(9, 0, 0, 0);
                                    
                                    // Late starts at 9AM
                                    if (inDate > nineAM) {
                                        const lateMs = inDate.getTime() - nineAM.getTime();
                                        const lateMins = Math.floor(lateMs / 60000);
                                        calcLate = lateMins > 0 ? lateMins + 'mins' : '0';
                                    } else {
                                        calcLate = '0';
                                    }
                                    
                                    // Total hours calculation capped at 9AM start
                                    const effectiveIn = inDate < nineAM ? nineAM : inDate;
                                    if (outDate > effectiveIn) {
                                        const diffMs = outDate.getTime() - effectiveIn.getTime();
                                        const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
                                        calcHrs = parseFloat(diffHrs).toString();
                                    } else {
                                        calcHrs = '0';
                                    }
                                }
                            }
                            
                            const tr = document.createElement('tr');
                            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                            tr.innerHTML = `
                                <td style="padding: 12px;">${dateStr}</td>
                                <td style="padding: 12px;">${emp}</td>
                                <td style="padding: 12px; color: var(--text-muted); font-size: 0.9em;">${b}</td>
                                <td style="padding: 12px;">${tIn}</td>
                                <td style="padding: 12px;">${tOut}</td>
                                <td style="padding: 12px; font-weight: 600;">${calcHrs}</td>
                                <td style="padding: 12px; color: ${calcLate !== '0' && calcLate !== '' ? 'var(--error)' : 'var(--text-muted)'};">${calcLate}</td>
                                <td style="padding: 12px; color: ${ot !== '0' && ot !== '' ? 'var(--primary)' : 'var(--text-muted)'};">${ot}</td>
                                <td style="padding: 12px;"><span style="background: rgba(34, 197, 94, 0.1); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">${status}</span></td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--error);">Failed to load records.</td></tr>';
                }
            } catch (error) {
                console.error(error);
                tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: var(--error);">Network error. Try again.</td></tr>';
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

        // Safety net: if the mouse button is released outside the browser window
        // (e.g. dragged off-screen, alt-tabbed mid-drag), no "mouseup" ever fires and
        // isDragging stays stuck true forever, hijacking every future mousemove on the
        // page (including scrollbar drags elsewhere). Reset on window blur too.
        window.addEventListener("blur", () => {
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

        // Safety net: reset stuck drag state if mouse is released outside the window.
        window.addEventListener("blur", () => {
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

        // Safety net: reset stuck drag state if mouse is released outside the window.
        window.addEventListener("blur", () => {
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

        // Safety net: reset stuck drag state if mouse is released outside the window.
        window.addEventListener("blur", () => {
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

        // Safety net: reset stuck drag state if mouse is released outside the window.
        window.addEventListener("blur", () => {
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

        // Safety net: reset stuck drag state if mouse is released outside the window.
        window.addEventListener("blur", () => {
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
        'Daily Check and Balance': ['Date', 'Branch', 'Cash Expense', 'Gcash Expenses', 'Gcash Receivable', 'Cash on hand', 'Daily Sales', 'Pondo Amount', 'Discrepancy', 'Remarks', 'Login Account'],
        'Customer Information Sheet': ['Date', 'Customer Name', 'Address', 'Mobile#', 'Number of Builds', 'Type of Build', 'Delivery Date', 'Delivery Method', 'Shipping Fee', 'Free Shipping Justification', 'Free Shipping Screenshot URL', 'Downpayment Amount', 'Reference Number', 'DP MOP', 'Tech Builder', 'Sales Admin', 'MarvsPC Page', 'Client Request', 'Build Status', 'Payment Completion', 'Delivery Status', 'Overall Status', 'Encoded By', 'Parts Releasing'],
        'Purchased Order': ['Date Requested', 'Admin Requested', 'Item Description', 'Qty', 'Status'],
        'Deliveries': ['Location', 'Delivery Method', 'Cost']
    };

    // Fix 15: the "Deliveries" Google Sheet tab name stays the same on the backend
    // (all getExpenseRecords/updateExpenseRecord calls still use the literal sheet
    // name "Deliveries"), but the app should now DISPLAY it to the user as
    // "Delivery Fee" everywhere (modal titles, PDF report headers/filenames).
    function sheetDisplayName(s) {
        return s === 'Deliveries' ? 'Delivery Fee' : s;
    }

    viewRecordsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sheet = btn.getAttribute('data-sheet');
            sheetNameInput.value = sheet;
            editTitle.textContent = "View & Edit: " + sheetDisplayName(sheet);
            
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
                } else if (sheet === 'Purchased Order') {
                    editStatusContainer.classList.remove('hidden');
                    editStatusFilter.innerHTML = '<option value="All">All Status</option><option value="Pending">Pending</option><option value="Partially Purchased">Partially Purchased</option><option value="Completed">Completed</option><option value="Rejected">Rejected</option>';
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
            const editCustomerNameContainer = document.getElementById('edit-customer-name-container');
            if (editCustomerNameContainer) editCustomerNameContainer.classList.add('hidden');
            const editLocationContainer = document.getElementById('edit-location-container');
            if (editLocationContainer) editLocationContainer.classList.add('hidden');
            const editStartDateContainer = document.getElementById('edit-start-date-container');
            const editEndDateContainer = document.getElementById('edit-end-date-container');
            if (editStartDateContainer) editStartDateContainer.classList.remove('hidden');
            if (editEndDateContainer) editEndDateContainer.classList.remove('hidden');
            const btnPrintEditReportToggle = document.getElementById('btn-print-edit-report');
            if (btnPrintEditReportToggle) btnPrintEditReportToggle.classList.remove('hidden');

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
                } else if (sheet === 'Customer Information Sheet') {
                    editBranchContainer.classList.add('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.add('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.add('hidden');
                    if (editSerialContainer) editSerialContainer.classList.add('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.add('hidden');
                    if (editCustomerNameContainer) editCustomerNameContainer.classList.remove('hidden');
                    const btnPrintEditReportEl = document.getElementById('btn-print-edit-report');
                    if (btnPrintEditReportEl) btnPrintEditReportEl.classList.add('hidden');
                } else if (sheet === 'Purchased Order') {
                    editBranchContainer.classList.add('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.add('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.add('hidden');
                    if (editSerialContainer) editSerialContainer.classList.add('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.add('hidden');
                } else if (sheet === 'Deliveries') {
                    editBranchContainer.classList.add('hidden');
                    if (editSupplierContainer) editSupplierContainer.classList.add('hidden');
                    if (editCategoryContainer) editCategoryContainer.classList.add('hidden');
                    if (editSerialContainer) editSerialContainer.classList.add('hidden');
                    if (editWarrantyNoContainer) editWarrantyNoContainer.classList.add('hidden');
                    if (editLocationContainer) editLocationContainer.classList.remove('hidden');
                    // Deliveries has no Date column at all — hide the date-range filter
                    // and the date-range-based Print Report button entirely for this sheet.
                    if (editStartDateContainer) editStartDateContainer.classList.add('hidden');
                    if (editEndDateContainer) editEndDateContainer.classList.add('hidden');
                    if (btnPrintEditReportToggle) btnPrintEditReportToggle.classList.add('hidden');
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
            
            // Set default dates: last 3 weeks for Customer Information Sheet (avoid loading the entire
            // sheet at once, which was causing the modal/table to hang on large record counts) and for
            // Purchased Order (Fix 24 -- so the list auto-loads a useful history instead of just today),
            // today for other sheets.
            // Users can still widen the Start/End Date fields manually to reach older records.
            if (sheet === 'Customer Information Sheet' || sheet === 'Purchased Order') {
                const today = new Date();
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(today.getDate() - 21);
                const fmt = (dt) => {
                    const y = dt.getFullYear();
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const d = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };
                startDateInput.value = fmt(threeWeeksAgo);
                endDateInput.value = fmt(today);
            } else {
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                const todayStr = `${y}-${m}-${d}`;
                startDateInput.value = todayStr;
                endDateInput.value = todayStr;
            }
            
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
                status: document.getElementById('edit-status-filter') ? document.getElementById('edit-status-filter').value : 'All',
                noCache: true
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
        
        if (sheet === 'Handover' || sheet === 'Warranty Items' || sheet === 'Item Purchased' || sheet === 'Purchased Order') {
            const selectedStatus = document.getElementById('edit-status-filter').value;
            if (selectedStatus && selectedStatus !== 'All') {
                const statusColIndex = (sheetColumns[sheet] || []).indexOf('Status');
                if (statusColIndex !== -1) {
                    filteredData = filteredData.filter(row => {
                        const val = (row[statusColIndex] || '').toString().trim().toLowerCase();
                        return val === selectedStatus.trim().toLowerCase();
                    });
                }
            } else if (sheet === 'Purchased Order') {
                // Fix 24c: a purchase request that's already Completed is done and just
                // clutters this list, so keep it out of the default "All Status" view
                // (mirrors the same idea already used for Customer Information Sheet's
                // "Item Released" rows). Explicitly picking "Completed" in the Status
                // filter above still shows them, since there's no separate dedicated
                // page for completed Purchased Orders the way Customer Info Sheet has.
                const statusColIndex = (sheetColumns[sheet] || []).indexOf('Status');
                if (statusColIndex !== -1) {
                    filteredData = filteredData.filter(row => (row[statusColIndex] || '').toString().trim().toLowerCase() !== 'completed');
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
        
        if (sheet === 'Customer Information Sheet') {
            const customerNameFilter = document.getElementById('edit-customer-name-filter') ? document.getElementById('edit-customer-name-filter').value.trim().toLowerCase() : '';
            if (customerNameFilter) {
                const nameColIndex = (sheetColumns[sheet] || []).indexOf('Customer Name');
                if (nameColIndex !== -1) {
                    filteredData = filteredData.filter(row => {
                        const val = (row[nameColIndex] || '').toString().toLowerCase();
                        return val.includes(customerNameFilter);
                    });
                }
            }

            // User request: once Parts Releasing reaches "Item Released", the
            // customer's parts are fully done, so keep it out of this generic
            // View & Edit list entirely (even when searching by name) to avoid
            // clutter -- only "Pending" (blank) and "Partially Released" rows
            // stay visible here. Fully-released customers are still viewable/
            // editable via the dedicated "Releasing of Build Status" page,
            // which shows every Parts Releasing state (including Item
            // Released, color-coded white) by design.
            const partsReleasingColIndex = (sheetColumns[sheet] || []).indexOf('Parts Releasing');
            if (partsReleasingColIndex !== -1) {
                filteredData = filteredData.filter(row => (row[partsReleasingColIndex] || '') !== 'Item Released');
            }
        }
        
        if (sheet === 'Deliveries') {
            const locationFilter = document.getElementById('edit-location-filter') ? document.getElementById('edit-location-filter').value.trim().toLowerCase() : '';
            if (locationFilter) {
                const locationColIndex = (sheetColumns[sheet] || []).indexOf('Location');
                if (locationColIndex !== -1) {
                    filteredData = filteredData.filter(row => {
                        const val = (row[locationColIndex] || '').toString().toLowerCase();
                        return val.includes(locationFilter);
                    });
                }
            }
        }

        if (sheet === 'MarvsPCStufz Expenses') {
            const selectedCategory = document.getElementById('edit-category-filter') ? document.getElementById('edit-category-filter').value : 'All';
            if (selectedCategory && selectedCategory !== 'All') {
                const categoryColIndex = (sheetColumns[sheet] || []).indexOf('Category');
                if (categoryColIndex !== -1) {
                    filteredData = filteredData.filter(row => row[categoryColIndex] === selectedCategory);
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

    const editCustomerNameInput = document.getElementById('edit-customer-name-filter');
    if (editCustomerNameInput) {
        editCustomerNameInput.addEventListener('input', applyEditModalFilters);
    }

    const editLocationInput = document.getElementById('edit-location-filter');
    if (editLocationInput) {
        editLocationInput.addEventListener('input', applyEditModalFilters);
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
                            <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 24px;">${sheetDisplayName(sheet)} Report</h2>
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
                    filename:     `${sheetDisplayName(sheet).replace(/\s+/g, '_')}_Report_${startDate}_to_${endDate}.pdf`,
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

    function buildRecordRow(row, sheet) {
        const colsCount = (sheetColumns[sheet] || []).length;
        const rowIndex = row[row.length - 1]; // The last element is the row index
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        // Fix 24c: color-code the whole Purchased Order row by Status so it's easy to
        // spot at a glance -- Rejected in red, Pending in amber/orange. The per-cell
        // divs below use "color: inherit" so setting it here on the <tr> cascades to
        // every cell's text; the Delete/Modify-Edit buttons set their own explicit
        // colors so they're unaffected.
        if (sheet === 'Purchased Order') {
            const statusColIdx = (sheetColumns[sheet] || []).indexOf('Status');
            const statusVal = (row[statusColIdx] || '').toString().trim();
            if (statusVal === 'Rejected') {
                tr.style.color = '#ef4444';
            } else if (statusVal === 'Pending') {
                tr.style.color = '#f59e0b';
            }
        }

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
            if (sheet === 'Remitted amount' || sheet === 'Daily Survey' || sheet === 'Warranty Items' || sheet === 'Handover' || sheet === 'Item Purchased' || sheet === 'Purchased Order') {
                isDateCol = (i === 0);
            } else if (sheet === 'Other Expenses') {
                isDateCol = (i === 0 || i === 1);
            } else if (sheet === 'Customer Information Sheet') {
                isDateCol = (i === 0 || i === 6);
            } else if (sheet === 'Deliveries') {
                isDateCol = false; // no Date column at all for this sheet
            } else {
                isDateCol = (i === 1);
            }
            if (isDateCol && val) {
                val = String(val).split(/[T ]/)[0];
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
            if (sheet !== 'Warranty Items' && sheet !== 'Handover' && sheet !== 'Purchased Order') {
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
            } else if (sheet === 'Purchased Order') {
                // Fix 24: instead of the old inline row-editing (cells turning into
                // contenteditable divs right in the table), Purchased Order now opens
                // its own dedicated form -- same "Modify/Edit" pattern already used by
                // Warranty Items and Handover above -- so Status can be a proper
                // dropdown (Pending / Partially Purchased / Completed) there.
                actionTd.appendChild(deleteBtn);
                const modifyBtn = document.createElement('button');
                modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modify/Edit';
                modifyBtn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;';
                modifyBtn.addEventListener('click', () => {
                    try {
                        document.getElementById('edit-records-modal').classList.add('hidden');
                        document.getElementById('marvspc-purchased-order-container').classList.remove('hidden');

                        document.getElementById('po-row-index').value = rowIndex;
                        document.getElementById('po-date-requested').value = (row[0] || '').split('T')[0];
                        // Fix 24b: keep the ORIGINAL requester's name as-is when editing --
                        // do not overwrite it with whoever is doing the editing right now.
                        document.getElementById('po-admin-requested').value = row[1] || sessionStorage.getItem('loggedInUser') || '';
                        document.getElementById('po-item-description').value = row[2] || '';
                        document.getElementById('po-qty').value = row[3] || '';

                        const statusSelect = document.getElementById('po-status');
                        if (statusSelect) statusSelect.value = row[4] || 'Pending';

                        const poFormHeadingEdit = document.getElementById('po-form-heading');
                        if (poFormHeadingEdit) poFormHeadingEdit.textContent = 'Edit Purchase Request';
                        const poSubmitBtnTextEdit = document.querySelector('#po-submit-btn .btn-text');
                        if (poSubmitBtnTextEdit) poSubmitBtnTextEdit.textContent = 'Update Request';
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
                                <h2 style="margin: 0 0 5px 0; color: #1e293b; font-size: 22px;">${sheetDisplayName(sheet)} Details</h2>
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
                        filename:     `${sheetDisplayName(sheet).replace(/\\s+/g, '_')}_Record.pdf`,
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

            if (sheet === 'Customer Information Sheet') {
                const releasingBtn = document.createElement('button');
                releasingBtn.innerHTML = '<i class="fas fa-dolly"></i> Releasing';
                releasingBtn.style.cssText = 'background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-left: 5px;';
                releasingBtn.addEventListener('click', () => openItemReleasingModal(row, rowIndex));
                actionTd.appendChild(releasingBtn);
            }

            tr.appendChild(actionTd);
        }

        return tr;
    }

    const EDIT_MODAL_PAGE_SIZE = 100;
    let editModalPageState = { rows: [], sheet: null, rendered: 0 };

    // targetRendered (optional): render up through at least this many rows in one go
    // instead of just EDIT_MODAL_PAGE_SIZE more. Used by renderRecords() to restore
    // however many rows were already loaded before a refresh (e.g. right after
    // editing/saving a row), so the user doesn't lose their scroll position/place in
    // the list just because one row was saved.
    function renderRecordsNextBatch(targetRendered) {
        const existingLoadMoreRow = document.getElementById('edit-modal-load-more-row');
        if (existingLoadMoreRow) existingLoadMoreRow.remove();

        const rows = editModalPageState.rows;
        const sheet = editModalPageState.sheet;
        const start = editModalPageState.rendered;
        const defaultEnd = start + EDIT_MODAL_PAGE_SIZE;
        const wantedEnd = (typeof targetRendered === 'number' && targetRendered > defaultEnd) ? targetRendered : defaultEnd;
        const end = Math.min(wantedEnd, rows.length);

        for (let idx = start; idx < end; idx++) {
            tbody.appendChild(buildRecordRow(rows[idx], sheet));
        }
        editModalPageState.rendered = end;

        if (editModalPageState.rendered < rows.length) {
            const remaining = rows.length - editModalPageState.rendered;
            const colsCount = (sheetColumns[sheet] || []).length;
            const loadMoreTr = document.createElement('tr');
            loadMoreTr.id = 'edit-modal-load-more-row';
            const loadMoreTd = document.createElement('td');
            loadMoreTd.colSpan = colsCount + 1;
            loadMoreTd.style.padding = '14px';
            loadMoreTd.style.textAlign = 'center';
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.type = 'button';
            loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Load More (${remaining} remaining)`;
            loadMoreBtn.style.cssText = 'background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 0.9em;';
            // Explicitly ignore the click event so it isn't mistaken for targetRendered.
            loadMoreBtn.addEventListener('click', () => renderRecordsNextBatch());
            loadMoreTd.appendChild(loadMoreBtn);
            loadMoreTr.appendChild(loadMoreTd);
            tbody.appendChild(loadMoreTr);
        }
    }

    // Renders the filtered/sorted record set into the table. To avoid building
    // hundreds of heavy DOM rows (each with several editable divs + action buttons
    // with their own listeners) all at once -- which was causing scroll/UI hangs on
    // large datasets like Customer Information Sheet -- only the first
    // EDIT_MODAL_PAGE_SIZE rows are rendered immediately; the rest render in batches
    // via the "Load More" button appended at the bottom of the table.
    function renderRecords(rows, sheet) {
        tbody.innerHTML = '';
        // If this is a refresh of the same sheet's data (e.g. triggered right after
        // saving one row's edit), keep however many rows were already loaded instead
        // of collapsing back to just the first page.
        const previouslyRendered = (editModalPageState.sheet === sheet) ? editModalPageState.rendered : 0;
        editModalPageState = { rows: rows || [], sheet: sheet, rendered: 0 };
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="padding: 15px; text-align: center; color: var(--text-muted);">No records found for this date range.</td></tr>';
            return;
        }

        renderRecordsNextBatch(previouslyRendered > EDIT_MODAL_PAGE_SIZE ? previouslyRendered : undefined);
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

    const closeItemReleasingModalBtnFix = document.getElementById('close-item-releasing-modal');
    const closeItemReleasingBtnFix = document.getElementById('close-item-releasing-btn');
    [closeItemReleasingModalBtnFix, closeItemReleasingBtnFix].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('item-releasing-modal').style.display = 'none';
        });
    });

    const closeBuildProgressModalBtn = document.getElementById('close-build-progress-modal');
    const closeBuildProgressBtn = document.getElementById('close-build-progress-btn');
    [closeBuildProgressModalBtn, closeBuildProgressBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('build-progress-modal').style.display = 'none';
        });
    });

    let currentReleasingRow = null;
    let currentReleasingRowIndex = null;

    function openItemReleasingModal(row, rowIndex) {
        currentReleasingRow = row;
        currentReleasingRowIndex = rowIndex;

        let dateStr = row[0] || '';
        if (dateStr && dateStr.includes('T')) dateStr = dateStr.split('T')[0];
        let deliveryDateStr = row[6] || '';
        if (deliveryDateStr && deliveryDateStr.includes('T')) deliveryDateStr = deliveryDateStr.split('T')[0];

        const fields = [
            { label: 'Date', value: dateStr || '-' },
            { label: 'Customer Name', value: row[1] || '-' },
            { label: 'Address', value: row[2] || '-' },
            { label: 'Mobile#', value: row[3] || '-' },
            { label: 'Number of Builds', value: row[4] || '-' },
            { label: 'Type of Build', value: row[5] || '-' },
            { label: 'Delivery Date', value: deliveryDateStr || '-' },
            { label: 'Sales Admin', value: row[15] || '-' },
            { label: 'Client Request', value: row[17] || '-' }
        ];

        const body = document.getElementById('item-releasing-body');
        body.innerHTML = fields.map(f => `
            <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="color: var(--text-muted); font-size: 0.82em; flex-shrink: 0;">${f.label}</span>
                <span style="color: #e2e8f0; font-size: 0.85em; text-align: right; word-break: break-word;">${f.value}</span>
            </div>
        `).join('');

        const partsStatusSelect = document.getElementById('item-releasing-parts-status');
        partsStatusSelect.value = row[23] || 'Pending';

        const statusMsg = document.getElementById('item-releasing-status-message');
        statusMsg.classList.add('hidden');

        document.getElementById('item-releasing-modal').style.display = 'flex';
    }

    const btnSaveItemReleasing = document.getElementById('btn-save-item-releasing');
    if (btnSaveItemReleasing) {
        btnSaveItemReleasing.addEventListener('click', async () => {
            if (!currentReleasingRow || !currentReleasingRowIndex) return;

            const statusMsg = document.getElementById('item-releasing-status-message');
            const newPartsStatus = document.getElementById('item-releasing-parts-status').value;

            btnSaveItemReleasing.disabled = true;
            const originalHtml = btnSaveItemReleasing.innerHTML;
            btnSaveItemReleasing.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                // Rebuild the full row (columns A-X) with only Parts Releasing (column X) changed
                const cols = sheetColumns['Customer Information Sheet'];
                const shouldAutoLineUp = (newPartsStatus === 'Item Released' || newPartsStatus === 'Partially Released');
                const updatedData = [];
                for (let i = 0; i < cols.length; i++) {
                    if (i === 23) {
                        updatedData.push(newPartsStatus);
                    } else if (i === 18 && shouldAutoLineUp) {
                        updatedData.push('Already for line up');
                    } else {
                        updatedData.push(currentReleasingRow[i] !== undefined ? currentReleasingRow[i] : '');
                    }
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'updateExpenseRecord',
                        sheetName: 'Customer Information Sheet',
                        rowIndex: currentReleasingRowIndex,
                        updatedData: updatedData,
                        encodedBy: sessionStorage.getItem('loggedInUser')
                    })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    currentReleasingRow[23] = newPartsStatus;
                    if (shouldAutoLineUp) currentReleasingRow[18] = 'Already for line up';
                    if (window.currentEditRecords) {
                        const rec = window.currentEditRecords.find(r => String(r[r.length - 1]) === String(currentReleasingRowIndex));
                        if (rec) {
                            rec[23] = newPartsStatus;
                            if (shouldAutoLineUp) rec[18] = 'Already for line up';
                        }
                    }
                    if (typeof applyEditModalFilters === 'function') applyEditModalFilters();
                    statusMsg.textContent = 'Saved successfully!';
                    statusMsg.className = 'status-message success';
                    statusMsg.classList.remove('hidden');
                    showToast('Parts Releasing status updated!', 'success');
                } else {
                    statusMsg.textContent = 'Error: ' + (result.message || 'Failed to save.');
                    statusMsg.className = 'status-message error';
                    statusMsg.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error saving item releasing status:', error);
                statusMsg.textContent = 'Network error. Please try again.';
                statusMsg.className = 'status-message error';
                statusMsg.classList.remove('hidden');
            } finally {
                btnSaveItemReleasing.disabled = false;
                btnSaveItemReleasing.innerHTML = originalHtml;
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
                    branch: document.getElementById('repl-branch').value,
                    noCache: true
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
              actionTd.style.cssText = 'display: flex; gap: 6px; align-items: center; white-space: nowrap; padding: 10px 12px;';
              
              const currentStatus = (row[13] || '').toString().toLowerCase();

              const viewBtn = document.createElement('button');
              viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
              viewBtn.style.cssText = 'background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.8em; width: 80px; text-align: center; flex-shrink: 0;';
              viewBtn.addEventListener('click', () => openItemReplacementView(row));
              actionTd.appendChild(viewBtn);
              
              const btn = document.createElement('button');
              btn.innerHTML = '<i class="fas fa-edit"></i> Update';
              btn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.8em; width: 80px; text-align: center; flex-shrink: 0;';
              btn.addEventListener('click', () => openItemReplacementForm(row));
              actionTd.appendChild(btn);
              tr.appendChild(actionTd);
              replTableBody.appendChild(tr);
        });
    }

    function openItemReplacementView(row) {
        const modal = document.getElementById('item-replacement-view-modal');
        const list = document.getElementById('item-replacement-view-list');
        if (!modal || !list) return;

        let dateStr = row[0] || '';
        if (dateStr && dateStr.includes('T')) dateStr = dateStr.split('T')[0];
        let dateReceivedStr = row[11] || '';
        if (dateReceivedStr && dateReceivedStr.includes('T')) dateReceivedStr = dateReceivedStr.split('T')[0];
        let replDateStr = row[16] || '';
        if (replDateStr && replDateStr.includes('T')) replDateStr = replDateStr.split('T')[0];
        let newDateReceivedStr = row[17] || '';
        if (newDateReceivedStr && newDateReceivedStr.includes('T')) newDateReceivedStr = newDateReceivedStr.split('T')[0];

        const fields = [
            { label: 'Warranty#', value: row[10] || '-' },
            { label: 'Recorded Date', value: dateStr || '-' },
            { label: 'Branch', value: row[1] || '-' },
            { label: 'Technician', value: row[2] || '-' },
            { label: 'Item Description', value: row[3] || '-' },
            { label: 'Serial#', value: row[4] || '-' },
            { label: 'PC#', value: row[5] || '-' },
            { label: 'Qty', value: row[6] || '-' },
            { label: 'Issue and Concern', value: row[7] || '-' },
            { label: 'Sup Approver', value: row[8] || '-' },
            { label: 'Status', value: row[9] || '-' },
            { label: 'Validation Status', value: row[13] || '-' },
            { label: 'Assigned Tech', value: row[14] || '-' },
            { label: 'Date Received', value: dateReceivedStr || '-' },
            { label: 'Remarks', value: row[15] || '-' },
            { label: 'Replacement Date', value: replDateStr || '-' },
            { label: '— New Replaced Item —', value: '', divider: true },
            { label: 'Date Received', value: newDateReceivedStr || '-' },
            { label: 'Item Description', value: row[18] || '-' },
            { label: 'Serial#', value: row[19] || '-' },
            { label: 'Sup Approver', value: row[20] || '-' },
            { label: 'Overall Status', value: row[21] || '-' }
        ];

        list.innerHTML = fields.map(f => f.divider ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.15); color: #a78bfa; font-size: 0.78em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${f.label}</div>
        ` : `
            <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="color: var(--text-muted); font-size: 0.82em; flex-shrink: 0;">${f.label}</span>
                <span style="color: #e2e8f0; font-size: 0.85em; text-align: right; word-break: break-word;">${f.value}</span>
            </div>
        `).join('');

        const modifyBtn = document.getElementById('item-replacement-view-modify-btn');
        if (modifyBtn) {
            modifyBtn.onclick = () => {
                modal.style.display = 'none';
                openItemReplacementForm(row);
            };
        }

        modal.style.display = 'flex';
    }

    const closeItemReplViewModalBtn = document.getElementById('close-item-replacement-view-modal');
    const closeItemReplViewBtn = document.getElementById('close-item-replacement-view-btn');
    [closeItemReplViewModalBtn, closeItemReplViewBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('item-replacement-view-modal').style.display = 'none';
        });
    });

    const closeItemReleasingModalBtn = document.getElementById('close-item-releasing-modal');
    const closeItemReleasingBtn = document.getElementById('close-item-releasing-btn');
    [closeItemReleasingModalBtn, closeItemReleasingBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('item-releasing-modal').style.display = 'none';
        });
    });

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

        // Pre-fill Replacement Item fields (R to V) with existing values if present
        let newDateReceivedStr = row[17] || '';
        if (newDateReceivedStr && newDateReceivedStr.includes('T')) newDateReceivedStr = newDateReceivedStr.split('T')[0];

        const dateReceivedInput = document.getElementById('repl-form-date-received');
        if (newDateReceivedStr) {
            dateReceivedInput.value = newDateReceivedStr;
        } else {
            dateReceivedInput.valueAsDate = new Date();
        }
        document.getElementById('repl-form-repl-item-desc').value = row[18] || '';
        document.getElementById('repl-form-repl-serial').value = row[19] || '';
        document.getElementById('repl-form-overall-status').value = row[21] || '';
        
        const loggedInUser = sessionStorage.getItem('loggedInUser') || '';
        document.getElementById('repl-form-sup-approver').value = row[20] || loggedInUser;
        
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


