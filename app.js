// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD4bJL8y0K0Kb3cKFA2Dm_OlDoPeTeo6MtiRzB_B8WBeX7GiU0gU2EBVAwd31BMPWV/exec';

function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        loginContainer.classList.add('hidden');
        mainMenuContainer.classList.add('hidden');
        expensesContainer.classList.add('hidden');
        adminContainer.classList.add('hidden');
        reportContainer.classList.add('hidden');
        dailySurveyContainer.classList.add('hidden');
        if (warrantyContainer) warrantyContainer.classList.add('hidden');
        if (handoverContainer) handoverContainer.classList.add('hidden');
        document.getElementById('edit-records-modal').classList.add('hidden');
    }

    function showApp(name) {
        hideAllContainers();
        mainMenuContainer.classList.remove('hidden');
        welcomeMessage.textContent = `Welcome, ${name}`;
        
        // Update user display in all screens
        document.querySelectorAll('.logged-in-user-display').forEach(el => {
            el.textContent = `Logged in as: ${name}`;
        });
    }

    function showLogin() {
        hideAllContainers();
        loginContainer.classList.remove('hidden');
        loginForm.reset();
        welcomeMessage.textContent = 'MGH Daily Expenses';
    }

    // Navigation Listeners
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

    menuReportBtn.addEventListener('click', () => {
        hideAllContainers();
        reportContainer.classList.remove('hidden');
    });

    if (menuSurveyBtn) {
        menuSurveyBtn.addEventListener('click', () => {
            hideAllContainers();
            dailySurveyContainer.classList.remove('hidden');
            document.getElementById('survey-date').valueAsDate = new Date();
            document.getElementById('report-survey-date').valueAsDate = new Date();
        });
    }

    if (menuWarrantyBtn) {
        menuWarrantyBtn.addEventListener('click', async () => {
            hideAllContainers();
            warrantyContainer.classList.remove('hidden');
            document.getElementById('warranty-date').valueAsDate = new Date();
            
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
            
            
            // (Approver logic moved up)
        });
    }

    backBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            hideAllContainers();
            document.getElementById(targetId).classList.remove('hidden');
            
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
        });
    });

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

    cashForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate URL
        if (SCRIPT_URL === 'PASTE_YOUR_URL_HERE' || SCRIPT_URL === '') {
            showMessage(cashStatusMessage, 'Please set your Google Apps Script URL in app.js', 'error');
            return;
        }

        // Get form data
        const formData = {
            action: 'addCashExpense',
            branch: document.getElementById('branch').value,
            date: document.getElementById('date').value,
            description: document.getElementById('description').value,
            amount: document.getElementById('amount').value,
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
                cashForm.reset();
                document.getElementById('date').valueAsDate = new Date(); // reset date to today
            } else {
                showMessage(cashStatusMessage, 'Error saving to Sheets: ' + result.message, 'error');
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

        const formData = {
            action: 'addGcashExpense',
            branch: document.getElementById('g-branch').value,
            date: document.getElementById('g-date').value,
            employee: document.getElementById('g-details').value, // Used to be employee, now details
            paymentMethod: document.getElementById('g-payment-method').value,
            amount: document.getElementById('g-amount').value,
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
                gcashForm.reset();
                document.getElementById('g-date').valueAsDate = new Date();
            } else {
                showMessage(gcashStatusMessage, 'Error saving to Sheets: ' + result.message, 'error');
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
            role: document.getElementById('acc-role').value
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
                    return;
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
                    const rows = result.data;
                    const container = document.getElementById('monthly-daily-record-list-container');
                    const tbody = document.querySelector('#monthly-daily-record-list-table tbody');
                    tbody.innerHTML = '';

                    if (!rows || rows.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No saved Daily Records found for the selected date range and branch.</td></tr>';
                    } else {
                        rows.forEach(row => {
                            const [rowDate, rowBranch, cashExp, gcashExp, gcashRec, cashOnHand, dailySales, pondoAmt, discrepancy] = row;
                            
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
                            `;
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
                            `;
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
                        updatedData: [date, branch, tech, itemDescription, serial, pc, qty, issue, approver, status],
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
                    formData.updatedData = JSON.stringify([date, branch, outgoingStaff, description, discussion, status, incomingStaff, remarks, approver]);
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(formData)
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    statusMessage.textContent = 'Handover record saved successfully!';
                    statusMessage.className = 'success-message';
                    handoverForm.reset();
                    document.getElementById('handover-row-index').value = '';
                    document.getElementById('handover-date').valueAsDate = new Date();
                    document.getElementById('handover-approver').value = (sessionStorage.getItem('userRole') !== 'Staff' && sessionStorage.getItem('userRole') !== 'Technician' && sessionStorage.getItem('userRole') !== 'Auditor') ? sessionStorage.getItem('loggedInUser') : '';
                    if (document.getElementById('handover-status').disabled) {
                        document.getElementById('handover-status').value = 'Pending';
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

                    const chartLabels = [];
                    const chartData = [];

                    filteredData.forEach(row => {
                        // row structure: [Date, Branch, Time, Count, Logged In]
                        const [rowDate, rowBranch, rowTime, rowCount, rowLoggedin] = row;
                        
                        let formattedDate = rowDate;
                        if (rowDate && String(rowDate).includes('T')) {
                            formattedDate = String(rowDate).split('T')[0];
                        }
                        
                        let formattedTime = rowTime;
                        if (rowTime && String(rowTime).includes('T')) {
                            const d = new Date(rowTime);
                            if (!isNaN(d.getTime())) {
                                let h = d.getHours();
                                const m = String(d.getMinutes()).padStart(2, '0');
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                h = h % 12;
                                h = h ? h : 12;
                                formattedTime = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
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

                    // Render Chart
                    if (surveyChartInstance) {
                        surveyChartInstance.destroy();
                    }
                    const ctx = document.getElementById('surveyChart').getContext('2d');
                    surveyChartInstance = new Chart(ctx, {
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
                if (canvas && surveyChartInstance) {
                    // Switch chart text/grid to dark for print
                    surveyChartInstance.options.scales.x.ticks.color = '#333';
                    surveyChartInstance.options.scales.x.grid.color = '#ddd';
                    surveyChartInstance.options.scales.y.ticks.color = '#333';
                    surveyChartInstance.options.scales.y.grid.color = '#ddd';
                    surveyChartInstance.options.plugins.legend.labels.color = '#333';
                    surveyChartInstance.update('none');

                    // Temporarily fill background with white to avoid transparent PNG rendering as black
                    const ctx = canvas.getContext('2d');
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    const chartDataUrl = canvas.toDataURL('image/jpeg', 1.0);
                    ctx.restore();
                    
                    // Revert chart to light text for UI
                    surveyChartInstance.options.scales.x.ticks.color = 'rgba(255, 255, 255, 0.7)';
                    surveyChartInstance.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.1)';
                    surveyChartInstance.options.scales.y.ticks.color = 'rgba(255, 255, 255, 0.7)';
                    surveyChartInstance.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
                    surveyChartInstance.options.plugins.legend.labels.color = 'rgba(255, 255, 255, 0.9)';
                    surveyChartInstance.update('none');

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
            } catch (error) {
                console.error(error);
                if (newTab) newTab.close();
                btnText.innerHTML = originalText;
                btnPrintSurvey.disabled = false;
                alert('Failed to generate PDF.');
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


// Make Expenses Form Draggable
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
        'Warranty Items': ['Date', 'Branch', 'Tech', 'Item Description', 'Serial#', 'PC#', 'Qty', 'Issue and Concern', 'Sup Approver', 'Status'],
        'Handover': ['Date', 'Branch', 'Outgoing Staff', 'Handover Description', 'Discussion', 'Status', 'Incoming Staff', 'Remarks', 'Approver']
    };

    viewRecordsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sheet = btn.getAttribute('data-sheet');
            sheetNameInput.value = sheet;
            editTitle.textContent = "View & Edit: " + sheet;
            
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
                th.textContent = col;
                theadTr.appendChild(th);
            });
            if (sheet !== 'Daily Survey') {
                const actionTh = document.createElement('th');
                actionTh.style.padding = '8px';
                actionTh.textContent = 'Actions';
                theadTr.appendChild(actionTh);
            }
            
            tbody.innerHTML = '<tr><td colspan="10" style="padding: 15px; text-align: center; color: var(--text-muted);">Click Load Records to view data.</td></tr>';
            editModal.classList.remove('hidden');
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
                branch: document.getElementById('edit-branch').value
            };
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                let filteredData = result.data;
                const selectedBranch = document.getElementById('edit-branch').value;
                if (selectedBranch && selectedBranch !== 'All') {
                    const branchColIndex = (sheetColumns[sheet] || []).indexOf('Branch');
                    if (branchColIndex !== -1) {
                        filteredData = filteredData.filter(row => row[branchColIndex] === selectedBranch);
                    }
                }
                renderRecords(filteredData, sheet);
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
                if (sheet === 'Remitted amount' || sheet === 'Daily Survey' || sheet === 'Warranty Items' || sheet === 'Handover') {
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
                
                td.innerHTML = `<input type="text" value="${val}" class="edit-input-${rowIndex}" readonly style="background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 4px 6px; color: inherit; width: 100%; min-width: 100px; outline: none; font-family: inherit; font-size: 0.95em;">`;
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
            
            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
            copyBtn.style.cssText = 'background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em; margin-right: 5px;';
            
            copyBtn.addEventListener('click', () => {
                if (sheet === 'Cash Expenses') {
                    document.getElementById('branch').value = row[0] || '';
                    document.getElementById('date').value = (row[1] || '').split('T')[0];
                    document.getElementById('description').value = row[2] || '';
                    document.getElementById('amount').value = String(row[3]).replace(/,/g, '') || '';
                    document.getElementById('receipt').value = row[4] || '';
                } else if (sheet === 'Gcash Expenses') {
                    document.getElementById('g-branch').value = row[0] || '';
                    document.getElementById('g-date').value = (row[1] || '').split('T')[0];
                    document.getElementById('g-details').value = row[2] || '';
                    document.getElementById('g-payment-method').value = row[3] || '';
                    document.getElementById('g-amount').value = String(row[4]).replace(/,/g, '') || '';
                    document.getElementById('g-reference').value = row[5] || '';
                    document.getElementById('g-receipt').value = row[6] || '';
                } else if (sheet === 'Gcash Receivable') {
                    document.getElementById('r-branch').value = row[0] || '';
                    document.getElementById('r-date').value = (row[1] || '').split('T')[0];
                    document.getElementById('r-customer-name').value = row[2] || '';
                    document.getElementById('r-no-of-hours').value = row[3] || '';
                    document.getElementById('r-payment-method').value = row[4] || '';
                    document.getElementById('r-reference').value = row[5] || '';
                    document.getElementById('r-amount').value = String(row[6]).replace(/,/g, '') || '';
                } else if (sheet === 'Cash on Hand') {
                    document.getElementById('coh-branch').value = row[0] || '';
                    document.getElementById('coh-date').value = (row[1] || '').split('T')[0];
                    document.getElementById('coh-amount').value = String(row[2]).replace(/,/g, '') || '';
                } else if (sheet === 'Remitted amount') {
                    document.getElementById('remit-date').value = (row[0] || '').split('T')[0];
                    document.getElementById('remit-bank').value = row[1] || '';
                    document.getElementById('remit-amount').value = String(row[2]).replace(/,/g, '') || '';
                    document.getElementById('remit-file').value = row[3] || '';
                    document.getElementById('remit-branch').value = row[5] || '';
                } else if (sheet === 'Other Expenses') {
                    document.getElementById('salary-start-date').value = (row[0] || '').split('T')[0];
                    document.getElementById('salary-end-date').value = (row[1] || '').split('T')[0];
                    document.getElementById('salary-branch').value = row[2] || '';
                    document.getElementById('expense-internet').value = String(row[3]).replace(/,/g, '') || '';
                    document.getElementById('expense-rent').value = String(row[4]).replace(/,/g, '') || '';
                    document.getElementById('expense-electricity').value = String(row[5]).replace(/,/g, '') || '';
                    document.getElementById('expense-water').value = String(row[6]).replace(/,/g, '') || '';
                    document.getElementById('expense-pondo').value = String(row[7]).replace(/,/g, '') || '';
                    document.getElementById('expense-food').value = String(row[8]).replace(/,/g, '') || '';
                    document.getElementById('expense-salary').value = String(row[9]).replace(/,/g, '') || '';
                }
                
                editModal.classList.add('hidden');
                
                // Show a quick visual feedback
                const notification = document.createElement('div');
                notification.textContent = 'Details copied to form! You can now modify and Save.';
                notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #8b5cf6; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 500; transition: opacity 0.5s;';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 500);
                }, 3000);
            });
            
            editBtn.addEventListener('click', () => {
                const inputs = tr.querySelectorAll(`.edit-input-${rowIndex}`);
                inputs.forEach(input => {
                    input.readOnly = false;
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
                    let valToSave = input.value;
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
                        // Reset UI
                        inputs.forEach(input => {
                            input.readOnly = true;
                            input.style.background = 'transparent';
                            input.style.border = 'none';
                            input.style.padding = '0';
                        });
                        saveBtn.style.display = 'none';
                        editBtn.style.display = 'inline-block';
                        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
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
                    actionTd.appendChild(copyBtn);
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
                                document.getElementById('warranty-date').value = row[0] || '';
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
                    if (currentRole === 'Supervisor' || currentRole === 'Manager' || currentRole === 'Owner') {
                        const modifyBtn = document.createElement('button');
                        modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modify/Edit';
                        modifyBtn.style.cssText = 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.4); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85em;';
                        modifyBtn.addEventListener('click', () => {
                            try {
                                document.getElementById('edit-records-modal').classList.add('hidden');
                                document.getElementById('handover-container').classList.remove('hidden');
                                
                                document.getElementById('handover-row-index').value = rowIndex;
                                document.getElementById('handover-date').value = row[0] || '';
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
                                    statusSelect.disabled = false;
                                    statusSelect.value = row[5] || 'Pending';
                                }
                            } catch(err) {
                                alert("Error populating form: " + err.message);
                            }
                        });
                        actionTd.appendChild(modifyBtn);
                    }
                }
                tr.appendChild(actionTd);
            }
            tbody.appendChild(tr);
        });
    }
});
