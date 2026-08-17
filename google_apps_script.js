// Helper to get or create sheet with header
function getOrCreateSheet(doc, name, headers) {
  var sheet = doc.getSheetByName(name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  }
  return sheet;
}

function logAction(doc, actionType, description, user) {
  var sheet = getOrCreateSheet(doc, "Audit Logs", ["Timestamp", "User", "Action Type", "Description"]);
  var timestamp = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([timestamp, user || "Unknown", actionType, description]);
}

// Fix 21: auto-migrates a "Manual Quotation" sheet that was created before the
// Quotation # column existed (i.e. by the original Fix 20 code) by inserting a
// new column A and shifting every existing column right by one. This preserves
// every already-saved quotation's data -- it just lands one column over,
// matching the new header -- instead of losing or misaligning it. Pre-migration
// rows simply show a blank Quotation # from then on; only rows saved after this
// runs get a real generated number. Called from BOTH the save path and the list
// read path (getExpenseRecords), so a list-view load can't see a stale header
// even if nobody has saved a new quotation since redeploying.
function ensureQuotationNumberColumn(sheet) {
  if (!sheet) return;
  var firstHeader = sheet.getRange(1, 1).getValue();
  if (firstHeader !== "Quotation #") {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("Quotation #");
    sheet.getRange(1, 1).setFontWeight("bold");
  }
}

// ===== Attendance helpers =====
function normalizeAttendanceDate(raw) {
  if (!raw) return '';
  if (Object.prototype.toString.call(raw) === "[object Date]" && !isNaN(raw)) {
    var y = raw.getFullYear();
    var m = ('0' + (raw.getMonth() + 1)).slice(-2);
    var d = ('0' + raw.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return String(raw).split('T')[0];
}

function parseTime(val) {
  if (!val) return 0;
  if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val)) {
    return val.getHours() * 60 + val.getMinutes() + val.getSeconds() / 60;
  }
  var str = String(val).trim();
  var isPM = str.toLowerCase().indexOf("pm") > -1;
  var isAM = str.toLowerCase().indexOf("am") > -1;
  str = str.replace(/[^\d:]/g, '');
  var parts = str.split(':').map(Number);
  var hrs = parts[0] || 0;
  var mins = parts[1] || 0;
  var secs = parts[2] || 0;
  if (isPM && hrs < 12) hrs += 12;
  if (isAM && hrs === 12) hrs = 0;
  return hrs * 60 + mins + secs / 60;
}

function calculateAttendanceHours(timeIn, timeOut) {
  var inMinutes = parseTime(timeIn);
  var outMinutes = parseTime(timeOut);
  var diff = outMinutes - inMinutes;
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

function handleTimeIn(data) {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(doc, "Attendance", ["Timestamp", "Date", "Employee", "Branch", "TimeIn", "TimeOut", "Hours", "Status", "OTHours", "Late"]);
    var employee = data.employee || '';
  var branch = data.branch || '';
  var dateStr = data.date || Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd");
  var userEmail = data.userEmail || data.encodedBy || 'Unknown';

  if (!employee) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Employee is required"})).setMimeType(ContentService.MimeType.JSON);
  }

  // Prevent double Time In per day per employee
  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (normalizeAttendanceDate(existing[i][1]) === dateStr && existing[i][2] === employee) {
      return ContentService.createTextOutput(JSON.stringify({status:"error", message: employee + " has already timed in today."})).setMimeType(ContentService.MimeType.JSON);
    }
  }

    var now = new Date();
    var timestamp = Utilities.formatDate(now, "Asia/Manila", "yyyy-MM-dd HH:mm:ss");
    var timeIn = Utilities.formatDate(now, "Asia/Manila", "HH:mm:ss");
  
    var lateStr = "0";
    // Using manila timezone explicitly to get the current hour and minute
    var manilaHour = parseInt(Utilities.formatDate(now, "Asia/Manila", "HH"), 10);
    var manilaMin = parseInt(Utilities.formatDate(now, "Asia/Manila", "mm"), 10);
    // getDay() is tricky with timezone, so let's format 'u' (1=Mon, 7=Sun) or 'E' (Mon, Tue)
    var manilaDay = Utilities.formatDate(now, "Asia/Manila", "u"); // 1=Mon, 7=Sun
    var dayNum = parseInt(manilaDay, 10);
    if (dayNum >= 1 && dayNum <= 6) { // Monday to Saturday
        var currentMins = manilaHour * 60 + manilaMin;
        var targetMins = 9 * 60; // 9:00 AM
        if (currentMins > targetMins) {
            lateStr = (currentMins - targetMins) + "mins";
        }
    }

    sheet.appendRow([timestamp, dateStr, employee, branch, timeIn, "", "", "Timed In", 0, lateStr]);
    logAction(doc, "Attendance Time In", employee + " timed in at " + branch + " (" + timeIn + ")", userEmail);
    return ContentService.createTextOutput(JSON.stringify({status:"success", message: employee + " timed in successfully at " + timeIn, timeIn: timeIn})).setMimeType(ContentService.MimeType.JSON);
  }

function handleTimeOut(data) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(doc, "Attendance", ["Timestamp", "Date", "Employee", "Branch", "TimeIn", "TimeOut", "Hours", "Status", "OTHours", "Late"]);
  var employee = data.employee || '';
  var dateStr = data.date || Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd");
  var userEmail = data.userEmail || data.encodedBy || 'Unknown';

  if (!employee) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Employee is required"})).setMimeType(ContentService.MimeType.JSON);
  }

  var rows = sheet.getDataRange().getValues();
  var targetRowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (normalizeAttendanceDate(rows[i][1]) === dateStr && rows[i][2] === employee) {
      if (rows[i][5]) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message: employee + " has already timed out today."})).setMimeType(ContentService.MimeType.JSON);
      }
      targetRowIndex = i; // 0-based index into rows/values
      break;
    }
  }

  if (targetRowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message:"No Time In record found for " + employee + " today."})).setMimeType(ContentService.MimeType.JSON);
  }

  var displayRows = sheet.getDataRange().getDisplayValues();
  var now = new Date();
  var timeOut = Utilities.formatDate(now, "Asia/Manila", "HH:mm:ss");
  var timeInStr = displayRows[targetRowIndex][4]; // Use display string instead of raw Date object
  var hours = calculateAttendanceHours(timeInStr, timeOut);
  
  var branch = displayRows[targetRowIndex][3] || '';
  var otHours = 0;
  if (branch.toLowerCase().includes("marvspcstufz") && hours > 10) {
    otHours = Math.round((hours - 10) * 100) / 100;
  }
  
  var sheetRow = targetRowIndex + 1; // convert to 1-based sheet row

  sheet.getRange(sheetRow, 6, 1, 4).setValues([[timeOut, hours, "Completed", otHours]]);
  logAction(doc, "Attendance Time Out", employee + " timed out at " + timeOut + " (" + hours + " hrs)", userEmail);
  return ContentService.createTextOutput(JSON.stringify({status:"success", message: employee + " timed out successfully at " + timeOut, timeOut: timeOut, hours: hours})).setMimeType(ContentService.MimeType.JSON);
}

function getAttendanceToday() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Attendance");
  var todayStr = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd");
  var results = [];
  if (sheet) {
    var dataRange = sheet.getDataRange();
    var data = dataRange.getValues();
    var displayData = dataRange.getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      if (normalizeAttendanceDate(data[i][1]) === todayStr) {
        var row = data[i].slice();
        row[4] = displayData[i][4]; // Use display string for TimeIn
        row[5] = displayData[i][5]; // Use display string for TimeOut
        row.push(i + 1); // sheet row index, for future edit/delete support
        results.push(row);
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);
}

function getAllAttendance() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Attendance");
  var results = [];
  if (sheet) {
    var dataRange = sheet.getDataRange();
    var data = dataRange.getValues();
    var displayData = dataRange.getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i].slice();
      row[1] = displayData[i][1]; // Use display string for Date
      row[4] = displayData[i][4]; // Use display string for TimeIn
      row[5] = displayData[i][5]; // Use display string for TimeOut
      row.push(i + 1); // sheet row index
      results.push(row);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);
}

function deleteAttendance(params) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Attendance");
  var rowIndex = parseInt(params.rowIndex, 10);
  if (!sheet || isNaN(rowIndex) || rowIndex < 2) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid row index."})).setMimeType(ContentService.MimeType.JSON);
  }
  sheet.deleteRow(rowIndex);
  var encodedBy = params.encodedBy || 'Unknown';
  logAction(doc, "Delete Attendance", "Deleted attendance row " + rowIndex, encodedBy);
  return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Record deleted successfully."})).setMimeType(ContentService.MimeType.JSON);
}

function getEmployeeList() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Account");
  var employees = [];
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var role = data[i][4];
      if (role === 'Technician' || role === 'Staff') {
        employees.push(data[i][1]);
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({status:"success", data:employees})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (false) {
    DriveApp.getRootFolder();
    DriveApp.createFile('dummy', 'dummy');
  }

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseError) {
        params = e.parameter;
      }
    } else {
      params = e.parameter;
    }
    
    if (!params || Object.keys(params).length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No parameters received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // OPTIONAL: Add simple token check
    // var SECRET_TOKEN = "MGH_2026_SECURE";
    // if (params.token !== SECRET_TOKEN && params.action !== 'login') {
    //   return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Unauthorized"})).setMimeType(ContentService.MimeType.JSON);
    // }

    var action = params.action;
    
    if (action === 'addMarvsPcExpense') {
      var sheet = getOrCreateSheet(doc, "MarvsPCStufz Expenses", ["Date","Category","Description","Amount","Account","EncodedBy"]);
      var date = params.date || '';
      var category = params.category || '';
      var description = params.description || '';
      var amount = parseFloat(params.amount) || 0;
      if (amount < 0) return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Amount cannot be negative"})).setMimeType(ContentService.MimeType.JSON);
      var account = params.account || '';
      var encodedBy = params.encodedBy || '';
      sheet.appendRow([date, category, description, amount, account, encodedBy]);
      logAction(doc, "Add MarvsPCStufz Expense", "Added ₱" + amount + " (" + description + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"MarvsPCStufz Expense saved"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'savePurchasedOrder') {
      var sheet = getOrCreateSheet(doc, "Purchased Order", ["Date Requested","Admin Requested","Item Description","Qty","Status"]);
      var dateRequested = params.dateRequested || '';
      var adminRequested = params.adminRequested || '';
      var itemDescription = params.itemDescription || '';
      var qty = parseInt(params.qty, 10) || 0;
      if (qty <= 0) return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Qty must be greater than 0"})).setMimeType(ContentService.MimeType.JSON);
      var status = params.status || 'Pending';
      var encodedBy = params.encodedBy || '';
      sheet.appendRow([dateRequested, adminRequested, itemDescription, qty, status]);
      logAction(doc, "Add Purchased Order", "Requested " + qty + "x " + itemDescription + " (" + status + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Purchase request saved"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveDelivery') {
      var sheet = getOrCreateSheet(doc, "Deliveries", ["Location","Delivery Method","Cost"]);
      var location = params.location || '';
      var deliveryMethod = params.deliveryMethod || '';
      var cost = parseFloat(params.cost) || 0;
      if (cost < 0) return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Cost cannot be negative"})).setMimeType(ContentService.MimeType.JSON);
      var encodedBy = params.encodedBy || '';
      sheet.appendRow([location, deliveryMethod, cost]);
      logAction(doc, "Add Delivery", "Delivery to " + location + " via " + deliveryMethod + " (₱" + cost + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Delivery saved"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveManualQuotation') {
      // Fix 20: one row per quotation. The flexible-length item list is stored
      // as a JSON string in the "Items" column (the user explicitly chose this
      // over a normalized two-sheet design -- see the AskUserQuestion round on
      // storage design), so this sheet stays a plain flat row like every other
      // sheet in this app, with no ID-linking or second tab needed.
      var sheet = getOrCreateSheet(doc, "Manual Quotation", ["Quotation #","Date","Customer Name","Company Name","Mobile#","Address","Items","Total Qty","Total Amount Before Discount","Discount","Total Amount","Encoded By"]);
      // Fix 21: migrate a pre-Fix-21 sheet (created before "Quotation #" existed) if needed.
      ensureQuotationNumberColumn(sheet);
      var date = params.date || '';
      var customerName = (params.customerName || '').toString().trim();
      var companyName = params.companyName || '';
      var mobile = params.mobile || '';
      var address = params.address || '';
      var encodedBy = params.encodedBy || '';

      if (!customerName) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Customer Name is required"})).setMimeType(ContentService.MimeType.JSON);
      }

      var items;
      try {
        items = JSON.parse(params.items || '[]');
      } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid items data"})).setMimeType(ContentService.MimeType.JSON);
      }
      if (!Array.isArray(items) || items.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"At least one item row is required"})).setMimeType(ContentService.MimeType.JSON);
      }

      // Recompute totals server-side from the items array itself rather than
      // trusting frontend-sent totals -- items is the source of truth here,
      // totals are always derived from it, never stored independently.
      var totalQty = 0;
      var totalBeforeDiscount = 0;
      var cleanItems = [];
      for (var i = 0; i < items.length; i++) {
        var desc = (items[i].desc || '').toString().trim();
        var qty = parseFloat(items[i].qty) || 0;
        var amount = parseFloat(items[i].amount) || 0;
        if (qty < 0 || amount < 0) {
          return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Qty and Amount cannot be negative"})).setMimeType(ContentService.MimeType.JSON);
        }
        if (!desc || qty <= 0) continue; // drop phantom/blank rows, same rule the frontend already applies
        totalQty += qty;
        totalBeforeDiscount += (qty * amount);
        cleanItems.push({desc: desc, qty: qty, amount: amount});
      }
      if (cleanItems.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"At least one item with a description and qty greater than 0 is required"})).setMimeType(ContentService.MimeType.JSON);
      }

      var discount = parseFloat(params.discount) || 0;
      if (discount < 0) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Discount cannot be negative"})).setMimeType(ContentService.MimeType.JSON);
      }
      var totalAmount = Math.max(totalBeforeDiscount - discount, 0);

      // Fix 21: generate a sequential, human-readable Quotation # (e.g. "QT-00007")
      // under a script lock, so two staff saving at the same moment can never be
      // handed the same number -- same LockService pattern already used elsewhere
      // in this file for sequential row placement (saveMultiplePurchasedItems).
      var quotationNumber = '';
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        var nextSeq = sheet.getLastRow(); // header = row 1; N existing data rows -> lastRow = N+1 = this row's 1-based position
        quotationNumber = "QT-" + ('00000' + nextSeq).slice(-5);
        sheet.appendRow([quotationNumber, date, customerName, companyName, mobile, address, JSON.stringify(cleanItems), totalQty, totalBeforeDiscount, discount, totalAmount, encodedBy]);
      } finally {
        lock.releaseLock();
      }

      logAction(doc, "Add Manual Quotation", "Quotation " + quotationNumber + " for " + customerName + " (" + cleanItems.length + " item" + (cleanItems.length === 1 ? "" : "s") + ", total ₱" + totalAmount + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Quotation saved", quotationNumber: quotationNumber})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'askAiSupport') {
      var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"AI chatbot is not set up yet. Ask your admin to add an ANTHROPIC_API_KEY in Apps Script's Project Settings → Script Properties."})).setMimeType(ContentService.MimeType.JSON);
      }
      var userMessage = (params.message || '').toString().trim();
      if (!userMessage) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Walang tanong na natanggap."})).setMimeType(ContentService.MimeType.JSON);
      }
      // Cap message length so a huge paste can't blow up the request/cost.
      if (userMessage.length > 2000) userMessage = userMessage.substring(0, 2000);

      // Fix 10n: a deterministic, zero-cost "is the latest code actually live"
      // check — type this exact phrase into the chat to instantly confirm which
      // fixes are deployed, with no ambiguity about redeploy/version steps and no
      // Anthropic API call involved. Bypasses everything else in this action.
      if (userMessage.toLowerCase() === 'debug version check') {
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          reply: "LIVE VERSION CHECK: Fix 10p-v2 marker found. This means Fix 10i (full computation + free-form dates), Fix 10j (multi-branch), Fix 10l (Taglish text / English voice), Fix 10m (Handover vs Daily Survey description), Fix 10n (this check), Fix 10o-v3 (exact single-date existence check, current-message-first), and Fix 10p-v2 (record-lookup search now prefers the current message and ranks rows by how many search terms they match, so a specific location isn't crowded out by unrelated rows sharing one common word, e.g. 'wala bang sta rosa laguna?' or 'magkano shipping fee sa sta rosa laguna') are ALL live on this deployment right now.",
          replyVoice: "Live version check passed. The latest fixes are deployed."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var history = params.history || [];
      var chatMessages = [];
      for (var h = 0; h < history.length; h++) {
        var turn = history[h];
        if (turn && (turn.role === 'user' || turn.role === 'assistant') && turn.content) {
          chatMessages.push({ role: turn.role, content: String(turn.content).substring(0, 2000) });
        }
      }
      chatMessages.push({ role: 'user', content: userMessage });

      // Both lookup paths below (record search + aggregate totals) originally only
      // looked at the CURRENT message for keywords/branch/topic. That breaks natural
      // follow-ups — e.g. asking "insight on Concepcion survey this week vs last
      // week", getting an answer, then following up with "why don't you see it, the
      // data's actually complete" has NO trigger words or branch name in that
      // follow-up itself, so no fresh lookup ran and the AI just guessed an apology
      // from chat history instead of re-checking real data (confirmed bug, reported
      // by the user). Fix: build a recency-bounded context string from the last few
      // turns (not the full 10-message history, so a topic from long ago doesn't
      // keep resurfacing forever) and use THAT for keyword/branch/topic detection,
      // while still computing/searching fresh data for every message.
      var recentContextText = chatMessages.slice(-6).map(function(m) { return m.content; }).join(" ");

      // Keep this description of the app in sync with the actual menu structure.
      // The AI only knows what's written here — update it whenever a feature is
      // added/renamed so the chatbot doesn't give outdated instructions.
      var systemPrompt = "You are a helpful support assistant built into the 'MGH Daily Expenses' internal " +
        "business app used by staff at MGH Parang, MGH Concepcion, and MarvsPCStufz. Answer staff questions " +
        "about how to use the app. Match the user's language style (Taglish/Tagalog/English) — default to " +
        "casual Taglish if unsure. Keep answers short and practical, like a quick how-to guide, not an essay. " +
        "Reply in PLAIN TEXT ONLY — do NOT use markdown formatting such as **bold**, _italics_, bullet dashes, " +
        "or headers, since the chat UI displays raw text and markdown symbols would show up literally. If you " +
        "need to list a few things, write them inline in a sentence (e.g. 'pwede mong gawin ang A, B, o C') " +
        "instead of using dashes or numbers on separate lines.\n\n" +
        "IMPORTANT — TWO-PART OUTPUT FORMAT (Fix 10l): your entire response MUST consist of exactly two parts " +
        "separated by a line containing only the literal text ===VOICE=== (that exact marker on its own line, " +
        "nothing else on that line). PART 1 (before the marker): your normal reply as described above, matching " +
        "the staff member's language (Taglish/Tagalog/English) — this is what gets shown as text in the chat. " +
        "PART 2 (after the marker): a natural, plain ENGLISH-ONLY rendition of the exact same content/answer — " +
        "not a literal word-for-word translation, just the same information expressed naturally in English — " +
        "this part is never shown as text, it is only read aloud by text-to-speech, so it must always be in " +
        "English regardless of what language Part 1 used. Always include both parts, always in that order, " +
        "always separated by exactly one line containing only ===VOICE===, even for short replies.\n\n" +
        "APP STRUCTURE:\n" +
        "Main Menu: Admin, MarvsPCStufz, Marvs Gaming Hub, Report, Warranty, Purchased Items, Attendance.\n" +
        "Marvs Gaming Hub (MGH) submenu — three SEPARATE, UNRELATED sheets, do not mix them up: (1) Expenses " +
        "(MGH branch daily expenses); (2) Daily Survey (logs foot-traffic/customer count per branch — Date, " +
        "Branch, Time, Count, Loggedin — this is the sheet used for 'survey'/'traffic'/'headcount' questions); " +
        "(3) Daily Handover (a per-branch shift handover log — Date, Branch, OutgoingStaff, Description, " +
        "Discussion, Status, IncomingStaff, Remarks, Approver, EncodedBy — used for staff mentioning 'handover' " +
        "or 'daily handover'; it does NOT contain survey/foot-traffic counts). If a question mentions 'handover' " +
        "it is about the Daily Handover sheet specifically, never about Daily Survey, even if both were " +
        "discussed in the same conversation — never explain a Daily Survey gap using Daily Handover data or " +
        "vice versa, they track completely different things.\n" +
        "MarvsPCStufz submenu: Expenses (log MarvsPCStufz-specific expenses); Customer Information Sheet " +
        "(customer/build records, has a View & Edit button to search/filter/edit past records); Releasing of " +
        "Build Status (tracks Parts Releasing status: Pending/Partially Released/Item Released, color-coded " +
        "red/green/white); Build Tracker (shows builds with an assigned Tech Builder); Build Status (coming " +
        "soon placeholder); Deliveries (log a delivery: Location, Delivery Method Motor/Van, Cost — no date " +
        "field; has a View button with a Location filter only); Purchased Order (request items to purchase: " +
        "Date Requested, Admin Requested auto-filled from the logged-in account, Item Description, Qty, Status " +
        "Pending/Ordered/Completed; has a View button with Status and date-range filters); Customer Support " +
        "(coming soon placeholder).\n" +
        "Warranty section: Warranty Validation and Item Replacement (role-gated to certain staff roles).\n" +
        "Report section: staff and admin-level reports — Survey Report, Detailed Analytics, Salary Expenses, " +
        "Monthly Income, Audit Logs, Attendance Report.\n" +
        "Attendance section: includes a Staff Schedule Generator for rotating shifts.\n" +
        "Purchased Items: for logging items already received from suppliers (different from Purchased Order, " +
        "which is for requesting items to be bought).\n" +
        "Most list views across the app have a 'View' or 'View & Edit' button that opens a table with " +
        "date-range and other filters, editable rows, and Delete/Print options.\n\n" +
        "If you're not sure about something specific to this business (exact policies, prices, approval rules, " +
        "things not described above), say so honestly and suggest asking a supervisor/admin instead of guessing.\n\n" +
        "When the staff member asks about a specific record — a customer/build status, a delivery cost for a " +
        "location, a purchase order, an attendance/expense entry, etc — the system automatically searches the " +
        "relevant sheets and, if it finds anything, appends a 'RELEVANT RECORDS FOUND' section below with the " +
        "matching rows. If that section is present, use it. If it's absent even though the question sounds " +
        "record-specific, say honestly that you couldn't find a matching record in the sheets instead of " +
        "guessing an answer.";

      // Smart record lookup: scan the app's operational sheets for rows relevant
      // to the user's question (e.g. a customer name, location, or keyword) and
      // attach only the matching rows as context. This keeps requests small/fast
      // even as sheets grow, and avoids exposing every record on every question.
      // The Account sheet (has staff passwords) and Audit Logs are never
      // included, on purpose — keep it that way even if more sheets are added.
      var AI_LOOKUP_SHEETS = [
        "Customer Information Sheet", "Purchased Order", "Item Purchased",
        "Supplier Prices", "Deliveries", "Warranty Items", "Handover",
        "Staff Schedule", "Daily Survey", "MarvsPCStufz Expenses",
        "Cash Expenses", "Gcash Expenses", "Gcash Receivable",
        "Remitted amount", "Cash on Hand", "Other Expenses",
        "Daily Check and Balance", "Monthly Income", "Attendance"
      ];
      var AI_STOPWORDS = {
        "ang":1,"ng":1,"sa":1,"mga":1,"ako":1,"ko":1,"mo":1,"niya":1,"nya":1,
        "kami":1,"tayo":1,"kayo":1,"sila":1,"yung":1,"yun":1,"ito":1,"iyon":1,
        "may":1,"wala":1,"gusto":1,"pwede":1,"paano":1,"ano":1,"bakit":1,
        "kailan":1,"saan":1,"sino":1,"kamusta":1,"kumusta":1,"status":1,
        "build":1,"the":1,"and":1,"for":1,"with":1,"about":1,"what":1,
        "how":1,"where":1,"when":1,"who":1,"can":1,"you":1,"please":1,
        "check":1,"tignan":1,"tingnan":1,"tanong":1,"question":1,"hello":1,
        "hi":1,"help":1,"tulong":1,"salamat":1,"thanks":1,"okay":1,"opo":1,
        "hindi":1,"oo":1,"yes":1,"no":1,"din":1,"rin":1,"lang":1,"lng":1,
        "pala":1,"naman":1,"talaga":1,"po":1,"nga":1,
        // Fix 10p: common Tagalog question particles/existence-fillers that add
        // no search value ("bang" = "ba" + "ng", used in almost every yes/no
        // question like "meron bang..."/"wala bang..."; "meron" is the informal
        // sibling of the already-stopworded "may"). Leaving these in as search
        // terms made the new AND-match-first logic (see below) fail to match
        // ANY row (since no data row literally contains the word "bang"),
        // causing an unnecessary fallback to the broader OR-match on every
        // single yes/no-style question.
        "bang":1,"meron":1,
        // Fix 10q: more pure connector/filler words with zero search value, found
        // via a real reported miss — asking to double-check a Handover entry for
        // "Parang" ("pwede mo bang i-check ang google sheet sa handover, kapag
        // tinignan ko dun meron naman entry ang parang") failed to surface it even
        // though it existed. These words never appear inside actual sheet data, so
        // leaving them as search terms only adds score-0 noise or (worse, together
        // with the totalMatches budget below) accidental substring hits in
        // unrelated free-text fields elsewhere that eat into the shared match
        // budget before Handover is ever reached. "tinignan"/"doon" are spelling
        // variants of the already-stopworded "tignan"/"dun".
        "pwede":1,"kapag":1,"dun":1,"doon":1,"tinignan":1,"google":1,"sheet":1
      };
      // Fix 10p: derive search terms from the CURRENT message first, falling back
      // to recentContextText only if the current message alone yields nothing
      // (a genuine dateless-style follow-up). Using recentContextText directly
      // here (the old behavior) meant that once the AI's own prior reply in the
      // conversation used words like "Motor", "delivery", "location", "cost",
      // those got folded into the search terms for EVERY later message in that
      // chat, drowning out a specific query. Same root cause/fix shape as the
      // Fix 10o v3 exact-date bug (gotcha #17's added caveat) — more context
      // isn't always better for precision-sensitive matching.
      function aiExtractSearchTerms(text) {
        return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
          .filter(function(w) { return w.length >= 3 && !AI_STOPWORDS[w]; });
      }
      var searchTermsFromMessage = aiExtractSearchTerms(userMessage);
      var searchTerms = searchTermsFromMessage.length > 0 ? searchTermsFromMessage : aiExtractSearchTerms(recentContextText);

      // Fix 10q: when the staff member names a sheet/topic explicitly (e.g.
      // "handover", "warranty", "purchase order"), that sheet must always get
      // searched -- but AI_LOOKUP_SHEETS is a fixed array and the loop below stops
      // once totalMatches hits MAX_TOTAL_MATCHES, so a sheet late in the array
      // could get starved out entirely by generic search terms racking up noise
      // matches (score-0-ish substring hits) in EARLIER sheets first. Real bug
      // this fixes: asking to double check a Handover entry for a specific branch
      // got "couldn't find it" even though the row existed, because Handover sits
      // 7th in the array and other, unrelated sheets ahead of it happened to eat
      // the whole budget first. Fix: move any sheet whose name is explicitly
      // mentioned in the current message to the FRONT of the search order (their
      // relative order among themselves, and among the rest, is preserved) so an
      // explicit topic mention is never starved by unrelated noise elsewhere.
      var AI_SHEET_ALIASES = {
        "Customer Information Sheet": ["customer"],
        "Purchased Order": ["purchase order", "purchased order", "purchase request"],
        "Item Purchased": ["item purchased", "purchased item"],
        "Supplier Prices": ["supplier"],
        "Deliveries": ["delivery", "deliveries"],
        "Warranty Items": ["warranty"],
        "Handover": ["handover"],
        "Staff Schedule": ["schedule", "shift"],
        "Daily Survey": ["survey"],
        "MarvsPCStufz Expenses": ["marvspc", "marvs pc"],
        "Cash Expenses": ["cash expense"],
        "Gcash Expenses": ["gcash expense"],
        "Gcash Receivable": ["gcash receivable", "receivable"],
        "Remitted amount": ["remit"],
        "Cash on Hand": ["cash on hand"],
        "Other Expenses": ["other expense"],
        "Daily Check and Balance": ["check and balance"],
        "Monthly Income": ["monthly income"],
        "Attendance": ["attendance", "time in", "time out"]
      };
      var lowerUserMessage = userMessage.toLowerCase();
      var mentionedLookupSheets = [];
      var unmentionedLookupSheets = [];
      for (var am = 0; am < AI_LOOKUP_SHEETS.length; am++) {
        var aliasList = AI_SHEET_ALIASES[AI_LOOKUP_SHEETS[am]] || [];
        var isMentioned = false;
        for (var al = 0; al < aliasList.length; al++) {
          if (lowerUserMessage.indexOf(aliasList[al]) !== -1) { isMentioned = true; break; }
        }
        if (isMentioned) { mentionedLookupSheets.push(AI_LOOKUP_SHEETS[am]); }
        else { unmentionedLookupSheets.push(AI_LOOKUP_SHEETS[am]); }
      }
      var orderedLookupSheets = mentionedLookupSheets.concat(unmentionedLookupSheets);

      // Fix 10o: track which sheet(s) this keyword lookup actually found matches
      // in. Used below as a fallback so the new exact-date check (see
      // findSingleExactDate) can still figure out which sheet to definitively
      // scan even on the very first message of a conversation, before a topic
      // keyword like "handover" has been said out loud yet.
      var matchedLookupSheetNames = [];

      if (searchTerms.length > 0) {
        var matchSections = [];
        var totalMatches = 0;
        var MAX_TOTAL_MATCHES = 30;
        var MAX_PER_SHEET = 8;
        for (var s = 0; s < orderedLookupSheets.length && totalMatches < MAX_TOTAL_MATCHES; s++) {
          var lookupSheet = doc.getSheetByName(orderedLookupSheets[s]);
          if (!lookupSheet) continue;
          var lookupData = lookupSheet.getDataRange().getValues();
          if (lookupData.length < 2) continue;
          var lookupHeaders = lookupData[0];
          var sheetMatches = [];
          var sheetHadMoreThanCap = false;
          function aiFormatRow(rowVals) {
            return lookupHeaders.map(function(h, i) {
              return h + ": " + (rowVals[i] !== undefined && rowVals[i] !== '' ? rowVals[i] : "-");
            }).join(", ");
          }
          // Fix 10p (v1): real bug found via user testing — asking "wala bang sta
          // rosa laguna?" got a reply saying no such entry exists, even though the
          // Deliveries sheet clearly had one. The v1 fix tried "require ALL search
          // terms match, else fall back to ANY term matches" — but that broke again
          // on a natural question like "magkano shipping fee sa sta rosa laguna":
          // words like "magkano"/"shipping"/"fee" never appear in the sheet data at
          // all, so the ALL-terms pass always found zero matches (nothing has those
          // words), forcing a fallback to the broad ANY-term pass — which brought
          // back the EXACT same crowding-out bug, since a generic term like "sta" or
          // "laguna" matches many rows and the cap filled up with other Laguna towns
          // before ever reaching "sta rosa laguna" specifically.
          // Fix 10p (v2) — SCORE-BASED RANKING instead of a strict ALL-or-ANY
          // two-pass: every row gets a score equal to how many of the search terms
          // it actually contains (0 if none). Rows are ranked by score first (most
          // matching terms wins), recency second (a tie-break, newest first), and
          // only the top MAX_PER_SHEET survive. This naturally handles noise words
          // that never appear in the data (they just contribute 0 to every row's
          // score, so they can't crowd anything out) without needing to guess in
          // advance which words are "meaningful" vs "filler" — "sta rosa laguna"
          // scores higher than any OTHER Laguna-area row because it's the only one
          // that matches all three of sta/rosa/laguna, regardless of how many
          // unrelated words (magkano/shipping/fee/etc) are also in the question.
          var scoredRows = [];
          for (var r = lookupData.length - 1; r >= 1; r--) {
            var rowVals = lookupData[r];
            var rowStr = rowVals.join(" ").toLowerCase();
            var score = 0;
            for (var t = 0; t < searchTerms.length; t++) {
              if (rowStr.indexOf(searchTerms[t]) !== -1) score++;
            }
            if (score > 0) {
              scoredRows.push({ row: rowVals, score: score, recencyIndex: r });
            }
          }
          // Highest score first; for equal scores, most recently added row first.
          scoredRows.sort(function(a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return b.recencyIndex - a.recencyIndex;
          });
          if (scoredRows.length > MAX_PER_SHEET) {
            sheetHadMoreThanCap = true;
          }
          var topScoredRows = scoredRows.slice(0, MAX_PER_SHEET);
          // Restore oldest-to-newest reading order for the section, same as before.
          topScoredRows.sort(function(a, b) { return a.recencyIndex - b.recencyIndex; });
          for (var i = 0; i < topScoredRows.length; i++) {
            sheetMatches.push(aiFormatRow(topScoredRows[i].row));
          }
          if (sheetMatches.length > 0) {
            var sectionHeader = "[" + orderedLookupSheets[s] + (sheetHadMoreThanCap ? " — showing the " + MAX_PER_SHEET + " most recent matches, older matches may exist" : "") + "]";
            matchSections.push(sectionHeader + "\n" + sheetMatches.join("\n"));
            totalMatches += sheetMatches.length;
            matchedLookupSheetNames.push(orderedLookupSheets[s]);
          }
        }
        if (matchSections.length > 0) {
          systemPrompt += "\n\nRELEVANT RECORDS FOUND (matched live from the app's sheets based on your " +
            "question — these are the MOST RECENT matching rows per sheet, capped at " + MAX_PER_SHEET +
            " each, not necessarily a complete history):\n" + matchSections.join("\n\n") +
            "\n\nUse ONLY the records above to answer specific factual questions (status, cost, dates, who's " +
            "assigned, etc). Mention that it's based on what's currently in the sheet and things may have " +
            "changed since, and suggest confirming with a supervisor/admin for anything important. If none " +
            "of the records above actually answer the question, say honestly that you couldn't find a " +
            "matching record instead of guessing. Do NOT attempt to compute totals, averages, sums, or " +
            "trends (like 'did counts increase') from these rows — you're only shown a capped sample, not " +
            "the full data set, so any computed total or trend would likely be wrong. If asked for that kind " +
            "of aggregate/trend analysis, say honestly that you can only look up individual records right " +
            "now, not compute totals or trends, and suggest checking the Report section of the app instead " +
            "— UNLESS a separate 'COMPUTED TOTALS' or 'EXACT DATE CHECK' section also appears below. Both of " +
            "those sections (if present) contain real backend-calculated results, not raw sample rows, and " +
            "ARE safe to state confidently — 'EXACT DATE CHECK' in particular is a complete, non-sampled scan " +
            "for one specific date, so treat it as the definitive answer for that date, never as 'just a " +
            "sample' the way the records above it are.";
        }
      }

      // Aggregate/insight support: whenever the conversation is clearly about one of
      // the topics below, ALWAYS compute REAL totals/counts directly from the
      // relevant sheet on the backend first — two date periods compared — rather
      // than only doing this when the phrasing happens to contain a
      // "total/compare/trend"-style word (Fix 10g removed that gate; topic mention
      // alone is enough). This is the general-chat version of the still-separate
      // "AI Insight for Survey Report" idea.
      //
      // Fix 10i (2026-08-16): extended from 4 topics to cover every operational
      // sheet that has a date column, added a "count" mode for sheets with no
      // numeric amount to sum (e.g. Handover — just counts matching rows), added
      // multi-column summing (valueCols) for sheets that split a total across
      // several fields (Other Expenses), and added free-form date-range parsing
      // (parseFreeformDateRange below) so staff can ask about ANY date range in
      // plain language, not just today/this-month/last-7-days. Two sheets are
      // deliberately NOT in this list because they have no date column at all
      // (Deliveries, Supplier Prices) — there's no way to bucket a dateless row
      // into a date range, so they stay on the Fix 10c/10d record-lookup path only.
      // See gotcha #16/#18 before adding more entries or changing column indices.
      //
      // Also fixed here: a real keyword-matching bug found while extending this
      // list. Plain lowerMessage.indexOf(key) matches "cash expense" as a substring
      // of "gcash expense" (no boundary before "cash"), so a question about Gcash
      // Expenses could silently match the Cash Expenses config instead, since Cash
      // Expenses came first in the array. aiKeyMatches() below requires a
      // non-alphanumeric boundary on both sides of the key so this can't happen.
      var AI_MONTHS = {
        jan:0, january:0, feb:1, february:1, mar:2, march:2, apr:3, april:3,
        may:4, jun:5, june:5, jul:6, july:6, aug:7, august:7,
        sep:8, sept:8, september:8, oct:9, october:9, nov:10, november:10, dec:11, december:11
      };
      function aiLastDayOfMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
      function aiEscapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
      function aiKeyMatches(text, key) {
        var re = new RegExp("(^|[^a-z0-9])" + aiEscapeRegex(key.toLowerCase()) + "([^a-z0-9]|$)", "i");
        return re.test(text);
      }
      // Best-effort free-form date range parser — NOT full NLP. Recognizes ISO
      // dates (2026-08-01), slash dates (8/1/2026 or 8/1), and "Month Day, Year"
      // English dates with day and year both optional (e.g. "August", "August 1",
      // "Aug 1, 2026"). Collects every date-like mention in the text; one mention
      // found → treated as a "since X" start (or an "until/before X" end if those
      // words immediately precede it) with the other end defaulting to today (or
      // 30 days back); two or more mentions → earliest position is the start,
      // latest is the end (covers "January to March", "Aug 1 to Aug 15", etc. — no
      // need to specifically match the connector word). Unrecognized phrasing
      // returns null and the caller falls back to the fixed today/month/week shapes.
      // Fix 10o: extracted the raw date-token recognition out of
      // parseFreeformDateRange so both that function AND the new
      // findSingleExactDate() (below) can share the same date-mention detection
      // instead of duplicating/drifting it.
      function findAiDateTokens(text, currentYear) {
        var lower = text.toLowerCase();
        var found = [];
        var m;

        var isoRe = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
        while ((m = isoRe.exec(lower)) !== null) {
          var yy = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1, dd = parseInt(m[3], 10);
          if (mo >= 0 && mo <= 11 && dd >= 1 && dd <= 31) {
            found.push({ index: m.index, len: m[0].length, year: yy, month: mo, day: dd, hasDay: true, hasYear: true });
          }
        }
        var slashRe = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
        while ((m = slashRe.exec(lower)) !== null) {
          var smo = parseInt(m[1], 10) - 1, sdd = parseInt(m[2], 10);
          var syr = m[3] ? parseInt(m[3], 10) : currentYear;
          if (syr < 100) syr += 2000;
          if (smo >= 0 && smo <= 11 && sdd >= 1 && sdd <= 31) {
            found.push({ index: m.index, len: m[0].length, year: syr, month: smo, day: sdd, hasDay: true, hasYear: !!m[3] });
          }
        }
        var monthNames = Object.keys(AI_MONTHS).join("|");
        var monthRe = new RegExp("\\b(" + monthNames + ")\\.?\\s*(\\d{1,2})?(?!\\d)(?:st|nd|rd|th)?,?\\s*(\\d{4})?\\b", "gi");
        while ((m = monthRe.exec(lower)) !== null) {
          var monKey = m[1].toLowerCase();
          if (!(monKey in AI_MONTHS)) continue;
          var mdd = m[2] ? parseInt(m[2], 10) : null;
          if (mdd !== null && (mdd < 1 || mdd > 31)) continue;
          // "may" is both the month name AND a very common standalone Tagalog word
          // ("may sale ba tayo?" = "do we have a sale?") — require a day or year
          // alongside it before treating it as a date, so ordinary Tagalog sentences
          // don't get misread as a date range. Other month names/abbreviations don't
          // collide with common words this way.
          if (monKey === "may" && !m[2] && !m[3]) continue;
          var myr = m[3] ? parseInt(m[3], 10) : currentYear;
          found.push({ index: m.index, len: m[0].length, year: myr, month: AI_MONTHS[monKey], day: mdd, hasDay: mdd !== null, hasYear: !!m[3] });
        }

        if (found.length === 0) return [];
        found.sort(function(a, b) { return a.index - b.index; });
        var deduped = [];
        var lastEnd = -1;
        for (var i = 0; i < found.length; i++) {
          if (found[i].index >= lastEnd) { deduped.push(found[i]); lastEnd = found[i].index + found[i].len; }
        }
        return deduped;
      }
      function parseFreeformDateRange(text, today) {
        var lower = text.toLowerCase();
        var currentYear = today.getFullYear();
        var found = findAiDateTokens(text, currentYear);
        if (found.length === 0) return null;

        function toStartDate(tok) { return new Date(tok.year, tok.month, tok.hasDay ? tok.day : 1); }
        function toEndDate(tok) { return new Date(tok.year, tok.month, tok.hasDay ? tok.day : aiLastDayOfMonth(tok.year, tok.month)); }

        var curStart, curEnd;
        if (found.length === 1) {
          var tok = found[0];
          var before = lower.substring(Math.max(0, tok.index - 20), tok.index);
          var looksLikeEnd = /(before|until|til|hanggang|bago)\s*$/.test(before) && !/(since|mula|nung|simula|starting)\s*$/.test(before);
          if (looksLikeEnd) {
            curEnd = toEndDate(tok);
            if (!tok.hasYear && curEnd.getTime() > today.getTime()) curEnd.setFullYear(curEnd.getFullYear() - 1);
            curStart = new Date(curEnd); curStart.setDate(curStart.getDate() - 30);
          } else {
            curStart = toStartDate(tok);
            if (!tok.hasYear && curStart.getTime() > today.getTime()) curStart.setFullYear(curStart.getFullYear() - 1);
            curEnd = new Date(today);
          }
        } else {
          var startTok = found[0], endTok = found[found.length - 1];
          curStart = toStartDate(startTok);
          curEnd = toEndDate(endTok);
          if (!startTok.hasYear && !endTok.hasYear && curEnd.getTime() > today.getTime()) {
            curStart.setFullYear(curStart.getFullYear() - 1);
            curEnd.setFullYear(curEnd.getFullYear() - 1);
          }
        }
        curStart.setHours(0, 0, 0, 0);
        curEnd.setHours(0, 0, 0, 0);
        if (curStart.getTime() > curEnd.getTime()) { var tmp = curStart; curStart = curEnd; curEnd = tmp; }
        return { curStart: curStart, curEnd: curEnd };
      }

      // Fix 10o: real bug found via user testing — asking "meron bang record sa
      // parang ng aug7" (does a record exist for Parang on Aug 7) got a hedged,
      // "sample lang ito, baka may mas luma pa" answer instead of a definitive
      // yes/no, because a single specific-date mention was ALWAYS being treated
      // by parseFreeformDateRange as the START of a range ("since Aug 7 until
      // today"), then only fed into either (a) the capped 8-row keyword sample
      // (gotcha #15, explicitly NOT meant to answer existence questions), or (b)
      // a period-vs-period total comparison — neither of which actually answers
      // "is there an entry on this exact day". findSingleExactDate() recognizes
      // when the staff member named exactly ONE date with no "since/until/
      // hanggang/mula" range cue nearby, meaning they mean that literal day —
      // the caller then does a full, uncapped scan of just that day instead of
      // guessing from a sample or computing an unrelated period total.
      function findSingleExactDate(text, today) {
        var lower = text.toLowerCase();
        var tokens = findAiDateTokens(text, today.getFullYear());
        if (tokens.length !== 1) return null; // ambiguous/range mention — leave to parseFreeformDateRange
        var tok = tokens[0];
        if (!tok.hasDay) return null; // a bare month ("August") isn't a single-day mention
        var before = lower.substring(Math.max(0, tok.index - 25), tok.index);
        var after = lower.substring(tok.index + tok.len, tok.index + tok.len + 25);
        // Check both BEFORE the date ("since/from/mula Aug 1") and AFTER it
        // ("Aug 1 onwards", "Aug 1 hanggang ngayon") — a range cue on either side
        // means this is really a range, not a single-day mention. NOTE: "nung" is
        // deliberately NOT in this list (real bug found via user testing, Fix 10o
        // follow-up) — "nung Aug 7" colloquially means "ON/last Aug 7" (a single
        // specific day), not "since Aug 7 onward". "mula"/"simula"/"starting" are
        // the actual range-starting words and stay in this list; only "nung" was
        // wrongly grouped with them.
        var isRangeCue =
          /(since|mula|buhat|simula|starting|from|before|until|til|hanggang|bago|between|range)\s*$/.test(before) ||
          /^\s*(up\s*to|until|til|hanggang|onwards|pataas|to\s+now)\b/.test(after);
        if (isRangeCue) return null; // explicit range language — let the period-comparison path handle it
        var exactDate = new Date(tok.year, tok.month, tok.day);
        if (!tok.hasYear && exactDate.getTime() > today.getTime()) exactDate.setFullYear(exactDate.getFullYear() - 1);
        exactDate.setHours(0, 0, 0, 0);
        return exactDate;
      }

      var AI_AGGREGATE_SHEETS = [
        { keys: ["survey","traffic","pasok","dumadaan","naglalaro","headcount","bilang ng tao","customer count"],
          sheet: "Daily Survey", dateCol: 0, branchCol: 1, mode: "sum", valueCol: 3, label: "survey / foot-traffic count" },
        { keys: ["gcash expense"],
          sheet: "Gcash Expenses", dateCol: 1, branchCol: 0, mode: "sum", valueCol: 4, label: "Gcash expense amount (₱)" },
        { keys: ["cash expense","cash gastos"],
          sheet: "Cash Expenses", dateCol: 1, branchCol: 0, mode: "sum", valueCol: 3, label: "cash expense amount (₱)" },
        { keys: ["gcash receivable"],
          sheet: "Gcash Receivable", dateCol: 1, branchCol: 0, mode: "sum", valueCol: 6, label: "Gcash receivable amount (₱)" },
        { keys: ["remitted","remittance"],
          sheet: "Remitted amount", dateCol: 0, branchCol: 5, mode: "sum", valueCol: 2, label: "remitted amount (₱)" },
        { keys: ["cash on hand"],
          sheet: "Cash on Hand", dateCol: 1, branchCol: 0, mode: "sum", valueCol: 2, label: "cash on hand amount (₱)" },
        { keys: ["other expense","ibang gastos"],
          sheet: "Other Expenses", dateCol: 0, branchCol: 2, mode: "sum", valueCols: [3,4,5,6,7,8,9], label: "other expenses total (₱) — Internet+Rent+Electricity+Water+Pondo+Food+Salary" },
        { keys: ["marvspc expense","marvs pc expense","stufz expense"],
          sheet: "MarvsPCStufz Expenses", dateCol: 0, branchCol: null, mode: "sum", valueCol: 3, label: "MarvsPCStufz expense amount (₱)" },
        { keys: ["sales","benta"],
          sheet: "Daily Check and Balance", dateCol: 0, branchCol: 1, mode: "sum", valueCol: 6, label: "daily sales (₱)" },
        { keys: ["item purchased","item received","purchased item"],
          sheet: "Item Purchased", dateCol: 0, branchCol: null, mode: "count", label: "items purchased/received (count)" },
        { keys: ["purchase order","purchased order","order request"],
          sheet: "Purchased Order", dateCol: 0, branchCol: null, mode: "sum", valueCol: 3, label: "purchased order quantity requested" },
        { keys: ["attendance","oras ng trabaho","hours worked"],
          sheet: "Attendance", dateCol: 1, branchCol: 3, mode: "sum", valueCol: 6, label: "attendance hours logged" },
        { keys: ["warranty item","warranty claim"],
          sheet: "Warranty Items", dateCol: 0, branchCol: 1, mode: "sum", valueCol: 6, label: "warranty item quantity" },
        { keys: ["handover"],
          sheet: "Handover", dateCol: 0, branchCol: 1, mode: "count", label: "handover entries (count)" },
        { keys: ["monthly income","net income"],
          sheet: "Monthly Income", dateCol: 0, branchCol: 2, mode: "sum", valueCol: 11, label: "monthly net income (₱)" },
        { keys: ["customer build","build orders","bagong build","build count"],
          sheet: "Customer Information Sheet", dateCol: 0, branchCol: null, mode: "count", label: "customer/build entries (count)" },
        { keys: ["staff schedule","shift hours","iskedyul"],
          sheet: "Staff Schedule", dateCol: 0, branchCol: 1, mode: "sum", valueCol: 4, label: "staff schedule shift hours" }
      ];
      var lowerMessage = recentContextText.toLowerCase();
      {
        var matchedAggConfig = null;
        for (var ac = 0; ac < AI_AGGREGATE_SHEETS.length; ac++) {
          if (AI_AGGREGATE_SHEETS[ac].keys.some(function(k) { return aiKeyMatches(lowerMessage, k); })) {
            matchedAggConfig = AI_AGGREGATE_SHEETS[ac];
            break;
          }
        }
        // Fix 10o fallback: if no topic keyword has been said out loud yet (e.g.
        // the very first message of a conversation, before "handover"/"survey"/
        // etc has come up), but the keyword-search record lookup above already
        // narrowed things down to exactly ONE relevant sheet, use that sheet's
        // config for the EXACT DATE CHECK below only — this fallback never powers
        // the COMPUTED TOTALS period comparison, which stays scoped to explicit
        // topic mentions exactly as before.
        var exactDateFallbackConfig = null;
        if (!matchedAggConfig && matchedLookupSheetNames.length === 1) {
          for (var afc = 0; afc < AI_AGGREGATE_SHEETS.length; afc++) {
            if (AI_AGGREGATE_SHEETS[afc].sheet === matchedLookupSheetNames[0]) { exactDateFallbackConfig = AI_AGGREGATE_SHEETS[afc]; break; }
          }
        }
        var exactDateConfig = matchedAggConfig || exactDateFallbackConfig;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        // Fix 10o v3: real bug found via user testing — using recentContextText
        // (last ~6 turns, INCLUDING the AI's own prior replies) here meant that
        // once the AI had already mentioned a couple of dates in an earlier reply
        // in the same conversation (e.g. "earliest entry starts Aug 13... Aug 14"),
        // any later single-date question ("meron ba nung aug7") would see 3+ date
        // mentions in the combined context and bail out as "ambiguous", even
        // though the CURRENT message clearly names exactly one day. Fixed by
        // checking the current message ALONE first — if it unambiguously names
        // one exact day, trust that immediately, regardless of what dates were
        // mentioned earlier in the conversation. Only fall back to scanning
        // recentContextText when the current message mentions NO date at all
        // (a genuine follow-up like "eh yung Concepcion?" that relies on a date
        // named in an earlier turn) — this keeps that follow-up case working
        // (the original reason recentContextText was used here) without letting
        // the AI's own prior replies drown out a clear, single-date question.
        var exactDateQuery = null;
        if (exactDateConfig) {
          exactDateQuery = findSingleExactDate(userMessage, today);
          if (exactDateQuery === null && findAiDateTokens(userMessage, today.getFullYear()).length === 0) {
            exactDateQuery = findSingleExactDate(recentContextText, today);
          }
        }

        // Figure out which branch(es) were mentioned, to filter/breakdown by.
        // Fix 10j: collect ALL mentioned branches, not just the first — a
        // question naming two branches ("for Concepcion and Parang") used to
        // silently resolve to whichever branch was checked first in this
        // if/else-if chain (always Parang, since it was listed first),
        // dropping the other branch entirely from the computed numbers. Now
        // each named branch gets its own current/previous total, plus a
        // combined total across just the named branches when more than one is
        // mentioned.
        var branchFilters = [];
        if (lowerMessage.indexOf("parang") !== -1) branchFilters.push("MGH Parang");
        if (lowerMessage.indexOf("concepcion") !== -1) branchFilters.push("MGH Concepcion");
        if (lowerMessage.indexOf("marvspc") !== -1 || lowerMessage.indexOf("marvs pc") !== -1 || lowerMessage.indexOf("pc stufz") !== -1) branchFilters.push("MarvsPCStufz");

        if (exactDateQuery && exactDateConfig) {
          // Fix 10o: staff named exactly ONE specific calendar date with no
          // range language ("since/until/hanggang") — do a COMPLETE, uncapped
          // scan of that single day across the whole sheet instead of a capped
          // sample or an unrelated period-vs-period total. This is what actually
          // answers "meron bang record sa parang ng aug7"-style questions
          // definitively, which neither older path could do.
          var edSheet = doc.getSheetByName(exactDateConfig.sheet);
          if (edSheet) {
            var edFmtDate = function(d) { return Utilities.formatDate(d, doc.getSpreadsheetTimeZone() || Session.getScriptTimeZone(), "yyyy-MM-dd"); };
            var edData = edSheet.getDataRange().getValues();
            var edHeaders = edData[0];
            var edTargetStr = edFmtDate(exactDateQuery);
            var edMatches = [];
            for (var er = 1; er < edData.length; er++) {
              var eRow = edData[er];
              var eRawDate = eRow[exactDateConfig.dateCol];
              if (!eRawDate) continue;
              var eDateStr = (Object.prototype.toString.call(eRawDate) === "[object Date]" && !isNaN(eRawDate))
                ? edFmtDate(eRawDate) : String(eRawDate).split('T')[0].split(' ')[0];
              if (eDateStr !== edTargetStr) continue;
              if (exactDateConfig.branchCol !== null && branchFilters.length > 0) {
                var eBranch = String(eRow[exactDateConfig.branchCol] || '').toLowerCase();
                var eBranchOk = branchFilters.some(function(bf) { return eBranch.indexOf(bf.toLowerCase()) !== -1; });
                if (!eBranchOk) continue;
              }
              edMatches.push(edHeaders.map(function(h, i) {
                return h + ": " + (eRow[i] !== undefined && eRow[i] !== '' ? eRow[i] : "-");
              }).join(", "));
            }
            var edBranchDesc = branchFilters.length > 0 ? (", filtered to " + branchFilters.join(" and ")) : "";
            systemPrompt += "\n\nEXACT DATE CHECK (a COMPLETE scan of every single row in the '" + exactDateConfig.sheet +
              "' sheet for exactly " + edTargetStr + edBranchDesc + " — this is NOT a capped sample, every row " +
              "in the sheet was checked for this date):\n" +
              (edMatches.length > 0 ? edMatches.join("\n") :
                "ZERO matching rows — there is no entry for this exact date" + edBranchDesc + " in the sheet.") +
              "\n\nThis is a complete, definitive answer for this specific date. You MAY confidently state " +
              "whether entries exist or not, and the exact count, since the entire sheet was checked (not a " +
              "sample) — do not hedge, do not say something like 'possible na may hindi kasama sa sample', " +
              "and do not tell the staff member to check the sheet manually for this specific date, unless " +
              "they ask about a different date or a broader range beyond what was checked here.";
          }
        } else if (matchedAggConfig) {
          var aggSheet = doc.getSheetByName(matchedAggConfig.sheet);
          if (aggSheet) {
            var fmtDate = function(d) { return Utilities.formatDate(d, doc.getSpreadsheetTimeZone() || Session.getScriptTimeZone(), "yyyy-MM-dd"); };
            var addDays = function(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; };
            var curStart, curEnd, prevStart, prevEnd;

            // Try free-form date parsing first (e.g. "since August 1", "January to
            // March"); only fall back to the fixed today/month/week shapes if no
            // explicit date was mentioned anywhere in the recent conversation.
            var freeform = parseFreeformDateRange(recentContextText, today);
            if (freeform) {
              curStart = freeform.curStart;
              curEnd = freeform.curEnd;
              var spanDays = Math.max(0, Math.round((curEnd.getTime() - curStart.getTime()) / 86400000));
              prevEnd = addDays(curStart, -1);
              prevStart = addDays(prevEnd, -spanDays);
            } else if (lowerMessage.indexOf("today") !== -1 || lowerMessage.indexOf("ngayong araw") !== -1) {
              curStart = curEnd = today;
              prevStart = prevEnd = addDays(today, -1);
            } else if (lowerMessage.indexOf("month") !== -1 || lowerMessage.indexOf("buwan") !== -1) {
              curStart = new Date(today.getFullYear(), today.getMonth(), 1);
              curEnd = today;
              prevEnd = addDays(curStart, -1);
              prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
            } else {
              curEnd = today;
              curStart = addDays(today, -6);
              prevEnd = addDays(curStart, -1);
              prevStart = addDays(prevEnd, -6);
            }
            var curStartStr = fmtDate(curStart), curEndStr = fmtDate(curEnd);
            var prevStartStr = fmtDate(prevStart), prevEndStr = fmtDate(prevEnd);

            function aiRowValue(config, row) {
              if (config.mode === "count") return 1;
              if (config.valueCols) {
                var sum = 0;
                for (var vc = 0; vc < config.valueCols.length; vc++) sum += (parseFloat(row[config.valueCols[vc]]) || 0);
                return sum;
              }
              return parseFloat(row[config.valueCol]) || 0;
            }

            var aggData = aggSheet.getDataRange().getValues();
            // Bucket totals per requested branch. If no branch was named (or the
            // sheet has no Branch column at all), use a single "ALL" bucket that
            // accepts every row — same behavior as before Fix 10j.
            var bucketKeys = (matchedAggConfig.branchCol !== null && branchFilters.length > 0) ? branchFilters : ["ALL"];
            var buckets = {};
            for (var bk = 0; bk < bucketKeys.length; bk++) {
              buckets[bucketKeys[bk]] = { curTotal: 0, curCount: 0, prevTotal: 0, prevCount: 0 };
            }
            for (var ar = 1; ar < aggData.length; ar++) {
              var aRow = aggData[ar];
              var bucketKey = "ALL";
              if (matchedAggConfig.branchCol !== null && branchFilters.length > 0) {
                var rowBranch = String(aRow[matchedAggConfig.branchCol] || '').toLowerCase();
                bucketKey = null;
                for (var bf = 0; bf < branchFilters.length; bf++) {
                  if (rowBranch.indexOf(branchFilters[bf].toLowerCase()) !== -1) { bucketKey = branchFilters[bf]; break; }
                }
                if (bucketKey === null) continue; // row's branch doesn't match any requested branch
              }
              var aRawDate = aRow[matchedAggConfig.dateCol];
              if (!aRawDate) continue;
              var aDateStr;
              if (Object.prototype.toString.call(aRawDate) === "[object Date]" && !isNaN(aRawDate)) {
                aDateStr = fmtDate(aRawDate);
              } else {
                aDateStr = String(aRawDate).split('T')[0].split(' ')[0];
              }
              var aVal = aiRowValue(matchedAggConfig, aRow);
              var bucket = buckets[bucketKey];
              if (aDateStr >= curStartStr && aDateStr <= curEndStr) {
                bucket.curTotal += aVal;
                bucket.curCount++;
              } else if (aDateStr >= prevStartStr && aDateStr <= prevEndStr) {
                bucket.prevTotal += aVal;
                bucket.prevCount++;
              }
            }

            function pctChangeTextFor(curTotal, prevTotal) {
              if (prevTotal !== 0) {
                var pc = ((curTotal - prevTotal) / prevTotal) * 100;
                return (pc >= 0 ? "+" : "") + pc.toFixed(1) + "%";
              } else if (curTotal !== 0) {
                return "N/A (previous period total was 0)";
              }
              return "N/A (no data in the previous period to compare against)";
            }
            function metricLineFor(curTotal, curCount, prevTotal, prevCount) {
              return matchedAggConfig.mode === "count"
                ? ("Current period (" + curStartStr + " to " + curEndStr + "): entry count = " + curCount + ".\n" +
                   "Previous period (" + prevStartStr + " to " + prevEndStr + "): entry count = " + prevCount + ".\n")
                : ("Current period (" + curStartStr + " to " + curEndStr + "): total = " + curTotal.toFixed(2) +
                   " across " + curCount + " entries.\n" +
                   "Previous period (" + prevStartStr + " to " + prevEndStr + "): total = " + prevTotal.toFixed(2) +
                   " across " + prevCount + " entries.\n");
            }

            // Single bucket (no branch named, or exactly one) keeps the original
            // flat output format. Two or more named branches get a per-branch
            // breakdown plus a combined total across just those branches, so the
            // AI can answer "for Concepcion and Parang" without silently dropping
            // one of them.
            var breakdownText, branchDescText;
            if (bucketKeys.length > 1) {
              breakdownText = "";
              var grandCur = 0, grandPrev = 0, grandCurCount = 0, grandPrevCount = 0;
              for (var bk2 = 0; bk2 < bucketKeys.length; bk2++) {
                var bName = bucketKeys[bk2];
                var b = buckets[bName];
                grandCur += b.curTotal; grandPrev += b.prevTotal;
                grandCurCount += b.curCount; grandPrevCount += b.prevCount;
                breakdownText += "-- " + bName + " --\n" + metricLineFor(b.curTotal, b.curCount, b.prevTotal, b.prevCount) +
                  "Change (" + bName + "): " + pctChangeTextFor(b.curTotal, b.prevTotal) + "\n\n";
              }
              breakdownText += "-- Combined across " + bucketKeys.join(" + ") + " --\n" +
                metricLineFor(grandCur, grandCurCount, grandPrev, grandPrevCount) +
                "Change (combined): " + pctChangeTextFor(grandCur, grandPrev) + "\n";
              branchDescText = ", broken down per branch for " + bucketKeys.join(" and ") + " (plus a combined total)";
            } else {
              var onlyBucket = buckets[bucketKeys[0]];
              breakdownText = metricLineFor(onlyBucket.curTotal, onlyBucket.curCount, onlyBucket.prevTotal, onlyBucket.prevCount) +
                "Change: " + pctChangeTextFor(onlyBucket.curTotal, onlyBucket.prevTotal) + "\n";
              branchDescText = bucketKeys[0] !== "ALL" ? (", filtered to " + bucketKeys[0]) : (matchedAggConfig.branchCol === null ? "" : " across all branches");
            }

            systemPrompt += "\n\nCOMPUTED TOTALS (calculated directly from the '" + matchedAggConfig.sheet +
              "' sheet on the backend — NOT a sample, this is a real sum/count over every matching row in each " +
              "date range" + branchDescText + "):\n" +
              "Metric: " + matchedAggConfig.label + "\n" +
              breakdownText + "\n" +
              "You MAY confidently state this comparison/trend using these exact numbers — they are real " +
              "computed totals, not an estimate. Clearly state which two date ranges were compared and " +
              "whether the filter was for a specific branch, multiple branches (state each one plus the " +
              "combined total if a breakdown is shown above), or all branches combined. If a period's entry " +
              "count is 0, say plainly that there wasn't enough data in that period rather than computing a " +
              "misleading percentage.";
          }
        }
      }

      var payload = {
        model: "claude-haiku-4-5",
        max_tokens: 500,
        system: systemPrompt,
        messages: chatMessages
      };
      var options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      try {
        var aiResponse = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", options);
        var aiResponseCode = aiResponse.getResponseCode();
        var aiResponseBody = JSON.parse(aiResponse.getContentText());
        if (aiResponseCode !== 200) {
          var errMsg = (aiResponseBody.error && aiResponseBody.error.message) ? aiResponseBody.error.message : ("AI request failed (HTTP " + aiResponseCode + ")");
          return ContentService.createTextOutput(JSON.stringify({status:"error", message: errMsg})).setMimeType(ContentService.MimeType.JSON);
        }
        var replyText = "";
        if (aiResponseBody.content && aiResponseBody.content.length > 0) {
          for (var c = 0; c < aiResponseBody.content.length; c++) {
            if (aiResponseBody.content[c].type === "text") {
              replyText += aiResponseBody.content[c].text;
            }
          }
        }
        // Fix 10l: the model is instructed to return TWO parts separated by a line
        // containing only "===VOICE===" — Part 1 (chat text, matches the staff
        // member's language) and Part 2 (English-only, spoken aloud by TTS only,
        // never shown as text). Split on the marker; if the model ever omits it
        // (rare, but don't crash), fall back to using the whole reply for both —
        // same best-effort behavior as before this fix, not a regression.
        var chatReplyText = replyText;
        var voiceReplyText = replyText;
        var voiceMarkerRe = /\n?\s*===VOICE===\s*\n?/;
        var voiceSplit = replyText.split(voiceMarkerRe);
        if (voiceSplit.length >= 2) {
          chatReplyText = voiceSplit[0].trim();
          voiceReplyText = voiceSplit.slice(1).join(" ").trim();
        }
        var chatEncodedBy = params.encodedBy || 'Unknown';
        logAction(doc, "AI Chat Question", userMessage.substring(0, 200), chatEncodedBy);
        return ContentService.createTextOutput(JSON.stringify({status:"success", reply: chatReplyText, replyVoice: voiceReplyText})).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Network error calling AI: " + err.message})).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'addCashExpense') {
      var sheet = getOrCreateSheet(doc, "Cash Expenses", ["Branch","Date","Description","Amount","Receipt","EncodedBy"]);
      var branch = params.branch || '';
      var date = params.date || '';
      var description = params.description || '';
      var amount = parseFloat(params.amount) || 0;
      var receipt = params.receipt || '';
      var encodedBy = params.encodedBy || '';

      // --- Validation Guards ---
      // 1. Empty Check
      if (!date || !description || !params.amount || params.amount === '') {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Please fill in all required fields"})).setMimeType(ContentService.MimeType.JSON);
      }
      // 2. Amount Check
      if (amount <= 0) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Amount must be greater than 0"})).setMimeType(ContentService.MimeType.JSON);
      }
      // 3. Future Date Check
      var today = new Date();
      today.setHours(0,0,0,0);
      var expenseDate = new Date(date);
      expenseDate.setHours(0,0,0,0);
      if (expenseDate > today) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Date cannot be in the future"})).setMimeType(ContentService.MimeType.JSON);
      }
      // 4. Duplicate Check (last 200 rows: Date + Amount + Description)
      var allData = sheet.getDataRange().getValues();
      var startIdx = Math.max(1, allData.length - 200);
      for (var i = startIdx; i < allData.length; i++) {
        var rowDate = allData[i][1] ? String(allData[i][1]).split('T')[0] : '';
        if (Object.prototype.toString.call(allData[i][1]) === '[object Date]') {
          var rd = allData[i][1];
          rowDate = rd.getFullYear() + '-' + ('0'+(rd.getMonth()+1)).slice(-2) + '-' + ('0'+rd.getDate()).slice(-2);
        }
        var rowAmount = parseFloat(allData[i][3]) || 0;
        var rowDesc = String(allData[i][2] || '').trim().toLowerCase();
        if (rowDate === date && rowAmount === amount && rowDesc === description.trim().toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Duplicate entry - this expense already exists"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      // --- End Validation ---

      sheet.appendRow([branch, date, description, amount, receipt, encodedBy]);
      logAction(doc, "Add Cash Expense", "Added ₱" + amount + " (" + description + ") to " + branch, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Row added successfully"})).setMimeType(ContentService.MimeType.JSON);
      
    } else if (action === 'addGcashExpense') {
      var sheet = getOrCreateSheet(doc, "Gcash Expenses", ["Branch","Date","Employee","PaymentMethod","Amount","Reference","Receipt","EncodedBy"]);
      var branch = params.branch || '';
      var date = params.date || '';
      var employee = params.employee || '';
      var paymentMethod = params.paymentMethod || '';
      var amount = parseFloat(params.amount) || 0;
      var reference = params.reference || '';
      var receipt = params.receipt || '';
      var encodedBy = params.encodedBy || '';

      // --- Validation Guards ---
      // 1. Empty Check
      if (!date || !params.amount || params.amount === '') {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Please fill in all required fields"})).setMimeType(ContentService.MimeType.JSON);
      }
      // 2. Amount Check
      if (amount <= 0) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Amount must be greater than 0"})).setMimeType(ContentService.MimeType.JSON);
      }
      // 3. Future Date Check
      var today = new Date();
      today.setHours(0,0,0,0);
      var expenseDate = new Date(date);
      expenseDate.setHours(0,0,0,0);
      if (expenseDate > today) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Date cannot be in the future"})).setMimeType(ContentService.MimeType.JSON);
      }
      // 4. Existing Reference Duplicate Check
      var gcashAllData = sheet.getDataRange().getValues();
      if (reference !== '') {
        for (var i = 1; i < gcashAllData.length; i++) {
          if (gcashAllData[i][5] == reference) {
            return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Duplicate Reference Number detected!"})).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      // 5. Duplicate Check (last 200 rows: Date + Amount + PaymentMethod)
      var startIdx = Math.max(1, gcashAllData.length - 200);
      for (var i = startIdx; i < gcashAllData.length; i++) {
        var rowDate = gcashAllData[i][1] ? String(gcashAllData[i][1]).split('T')[0] : '';
        if (Object.prototype.toString.call(gcashAllData[i][1]) === '[object Date]') {
          var rd = gcashAllData[i][1];
          rowDate = rd.getFullYear() + '-' + ('0'+(rd.getMonth()+1)).slice(-2) + '-' + ('0'+rd.getDate()).slice(-2);
        }
        var rowAmount = parseFloat(gcashAllData[i][4]) || 0;
        var rowPayment = String(gcashAllData[i][3] || '').trim().toLowerCase();
        if (rowDate === date && rowAmount === amount && rowPayment === paymentMethod.trim().toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Duplicate entry - this expense already exists"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      // --- End Validation ---

      sheet.appendRow([branch, date, employee, paymentMethod, amount, reference, receipt, encodedBy]);
      logAction(doc, "Add Gcash Expense", "Added ₱" + amount + " to " + branch, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Row added successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'addGcashReceivable') {
      var sheet = getOrCreateSheet(doc, "Gcash Receivable", ["Branch","Date","CustomerName","NoOfHours","PaymentMethod","Reference","Amount","Employee","EncodedBy"]);
      var branch = params.branch || '';
      var date = params.date || '';
      var customerName = params.customerName || '';
      var noOfHours = params.noOfHours || '';
      var paymentMethod = params.paymentMethod || '';
      var reference = params.reference || '';
      var amount = parseFloat(params.amount) || 0;
      var employee = params.employee || '';
      var encodedBy = params.encodedBy || '';
      if (reference !== '') {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][5] == reference) {
            return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Duplicate Reference Number detected!"})).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      sheet.appendRow([branch, date, customerName, noOfHours, paymentMethod, reference, amount, employee, encodedBy]);
      logAction(doc, "Add Gcash Receivable", "Added ₱" + amount + " for " + customerName + " in " + branch, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Row added successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'addRemittedAmount') {
      var sheet = getOrCreateSheet(doc, "Remitted amount", ["Date","BankName","Amount","FileUrl","EncodedBy","Branch"]);
      var date = params.date || '';
      var branch = params.branch || '';
      var bankName = params.bankName || '';
      var amount = parseFloat(params.amount) || 0;
      var fileName = params.fileName || 'receipt.png';
      var mimeType = params.mimeType || 'image/png';
      var fileData = params.fileData || '';
      var fileUrl = '';
      if (fileData !== '') {
        try {
          var decodedData = Utilities.base64Decode(fileData);
          var blob = Utilities.newBlob(decodedData, mimeType, fileName);
          var folderName = "Daily Remitted Screenshot";
          var folders = DriveApp.getFoldersByName(folderName);
          var folder;
          if (folders.hasNext()) {
            folder = folders.next();
          } else {
            folder = DriveApp.createFolder(folderName);
          }
          var file = folder.createFile(blob);
          fileUrl = file.getUrl();
        } catch (uploadError) {
          return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Error uploading file: " + uploadError.toString()})).setMimeType(ContentService.MimeType.JSON);
        }
      } else {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Screenshot image is required."})).setMimeType(ContentService.MimeType.JSON);
      }
      var encodedBy = params.encodedBy || '';
      sheet.appendRow([date, bankName, amount, fileUrl, encodedBy, branch]);
      logAction(doc, "Add Remitted Amount", "Remitted ₱" + amount + " to " + bankName, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Remittance saved with image successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'addCashOnHand') {
      var sheet = getOrCreateSheet(doc, "Cash on Hand", ["Branch","Date","Amount","EncodedBy"]);
      var branch = params.branch || '';
      var date = params.date || '';
      var amount = parseFloat(params.amount) || 0;
      var encodedBy = params.encodedBy || '';
      sheet.appendRow([branch, date, amount, encodedBy]);
      logAction(doc, "Add Cash on Hand", "Added ₱" + amount + " for " + branch, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Row added successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'addSalaryExpense') {
      var sheet = getOrCreateSheet(doc, "Other Expenses", ["StartDate","EndDate","Branch","Internet","Rent","Electricity","Water","Pondo","Food","Salary","EncodedBy"]);
      var startDate = params.startDate || '';
      var endDate = params.endDate || '';
      var branch = params.branch || '';
      var internetCost = parseFloat(params.internetCost) || 0;
      var rentCost = parseFloat(params.rentCost) || 0;
      var electricityCost = parseFloat(params.electricityCost) || 0;
      var waterCost = parseFloat(params.waterCost) || 0;
      var pondoCost = parseFloat(params.pondoCost) || 0;
      var foodCost = parseFloat(params.foodCost) || 0;
      var salaryCost = parseFloat(params.salaryCost) || 0;
      var encodedBy = params.encodedBy || 'Unknown';
      sheet.appendRow([startDate, endDate, branch, internetCost, rentCost, electricityCost, waterCost, pondoCost, foodCost, salaryCost, encodedBy]);
      logAction(doc, "Add Other Expense", "Added expenses for " + branch + " (" + startDate + " to " + endDate + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Row added successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveDailyCheck') {
      var sheet = getOrCreateSheet(doc, "Daily Check and Balance", ["Date","Branch","CashExpense","GcashExpenses","GcashReceivable","CashOnHand","DailySales","PondoAmount","Discrepancy","Remarks","EncodedBy"]);
      var date = params.date || '';
      var branch = params.branch || '';
      var cashExpense = parseFloat(params.cashExpense) || 0;
      var gcashExpenses = parseFloat(params.gcashExpenses) || 0;
      var gcashReceivable = parseFloat(params.gcashReceivable) || 0;
      var cashOnHand = parseFloat(params.cashOnHand) || 0;
      var dailySales = parseFloat(params.dailySales) || 0;
      var pondoAmount = parseFloat(params.pondoAmount) || 0;
      var discrepancy = parseFloat(params.discrepancy) || 0;
      var remarks = params.remarks || '';
      var encodedBy = params.encodedBy || '';
      if (discrepancy === 0 && remarks === '') {
        remarks = 'Balanced';
      }
      sheet.appendRow([date, branch, cashExpense, gcashExpenses, gcashReceivable, cashOnHand, dailySales, pondoAmount, discrepancy, remarks, encodedBy]);
      logAction(doc, "Save Daily Check & Balance", "Saved daily check for " + branch + " (" + date + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Row added successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'deleteDailyCheck') {
      var sheet = doc.getSheetByName("Daily Check and Balance");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Could not find a tab named 'Daily Check and Balance'"})).setMimeType(ContentService.MimeType.JSON);
      }
      var rowIndex = parseInt(params.rowIndex);
      if (!rowIndex || rowIndex <= 1) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid row index"})).setMimeType(ContentService.MimeType.JSON);
      }
      sheet.deleteRow(rowIndex);
      var encodedBy = params.encodedBy || "Unknown";
      logAction(doc, "Delete Daily Check", "Deleted daily check at row " + rowIndex, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Record deleted successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'deleteRecord') {
      var sheetName = params.sheetName || "";
      var rowIndex = parseInt(params.rowIndex);
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Could not find a tab named '" + sheetName + "'"})).setMimeType(ContentService.MimeType.JSON);
      }
      if (!rowIndex || rowIndex <= 1) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid row index"})).setMimeType(ContentService.MimeType.JSON);
      }
      sheet.deleteRow(rowIndex);
      var encodedBy = params.encodedBy || "Unknown";
      logAction(doc, "Delete Record", "Deleted row " + rowIndex + " from " + sheetName, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Record deleted successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'createAccount') {
      var sheet = getOrCreateSheet(doc, "Account", ["Date","Name","AccountName","Password","Role","Store"]);
      var date = params.date || '';
      var name = params.name || '';
      var accountName = params.accountName || '';
      var password = params.password || '';
      var role = params.role || '';
      var store = params.store || '';
      if (role === 'Owner') {
        var data = sheet.getDataRange().getValues();
        for (var i = 0; i < data.length; i++) {
          if (data[i][4] === 'Owner') {
            return ContentService.createTextOutput(JSON.stringify({status:"error", message:"An Owner account already exists. Only one Owner is allowed."})).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      sheet.appendRow([date, name, accountName, password, role, store]);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Account created successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'login') {
      var sheet = doc.getSheetByName("Account");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Could not find a tab named 'Account'"})).setMimeType(ContentService.MimeType.JSON);
      }
      var username = params.username || '';
      var password = params.password || '';
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var sheetUsername = (data[i][2] !== undefined && data[i][2] !== null) ? data[i][2].toString() : '';
        var sheetPassword = (data[i][3] !== undefined && data[i][3] !== null) ? data[i][3].toString() : '';
        if (sheetUsername === username.toString() && sheetPassword === password.toString()) {
          return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Login successful", name:data[i][1], role:data[i][4], store:data[i][5]})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid Username or Password"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getTechnicians') {
      var sheet = doc.getSheetByName("Account");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Sheet 'Account' not found"})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var technicians = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][4] === 'Technician' || data[i][4] === 'Staff') {
          technicians.push(data[i][1]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:technicians})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getApprovers') {
      var sheet = doc.getSheetByName("Account");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Sheet 'Account' not found"})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var approvers = [];
      for (var i = 1; i < data.length; i++) {
        var role = data[i][4];
        if (role === 'Supervisor' || role === 'Manager' || role === 'Owner') {
          approvers.push(data[i][1]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:approvers})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getRmaAdmins') {
      // FIXED: Now includes RMA Admin, Supervisor, Manager, Owner
      var sheet = doc.getSheetByName("Account");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Sheet 'Account' not found"})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var rmaAdmins = [];
      for (var i = 1; i < data.length; i++) {
        var role = data[i][4];
        if (role === 'RMA Admin' || role === 'Supervisor' || role === 'Manager' || role === 'Owner') {
          rmaAdmins.push(data[i][1]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:rmaAdmins})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getReportData') {
      var reportType = params.reportType || '';
      var startDateStr = params.startDate || '';
      var endDateStr = params.endDate || '';
      var branchFilter = params.branch || 'All';
      var tabNameMap = {
        'Cash Expense': 'Cash Expenses',
        'Gcash Expense': 'Gcash Expenses',
        'Gcash Receivable': 'Gcash Receivable',
        'Remitted Amount': 'Remitted amount',
        'Cash on Hand': 'Cash on Hand'
      };
      var sheetName = tabNameMap[reportType];
      if (!sheetName) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid Report Type"})).setMimeType(ContentService.MimeType.JSON);
      }
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Could not find a tab named '" + sheetName + "'"})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var filteredData = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var dateIdx = 1;
        var branchIdx = 0;
        if (sheetName === 'Remitted amount') {
          dateIdx = 0;
          branchIdx = 5;
        }
        var rowDateRaw = row[dateIdx];
        if (!rowDateRaw) continue;
        var rowDateStr = "";
        if (Object.prototype.toString.call(rowDateRaw) === "[object Date]" && !isNaN(rowDateRaw)) {
          var y = rowDateRaw.getFullYear();
          var m = rowDateRaw.getMonth() + 1;
          var d = rowDateRaw.getDate();
          rowDateStr = y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
        } else {
          try {
            rowDateStr = Utilities.formatDate(new Date(rowDateRaw), Session.getScriptTimeZone(), "yyyy-MM-dd");
          } catch(e) {
            rowDateStr = rowDateRaw.toString().split('T')[0];
          }
        }
        if (startDateStr !== '' && rowDateStr < startDateStr) continue;
        if (endDateStr !== '' && rowDateStr > endDateStr) continue;
        if (branchFilter !== 'All' && branchIdx !== -1) {
          if (row[branchIdx] !== branchFilter) continue;
        }
        row[dateIdx] = rowDateStr;
        filteredData.push(row);
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:filteredData, sheetName:sheetName})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getDailyCheckList') {
      var dateStr = params.date || '';
      var branchFilter = params.branch || 'All';
      var sheet = doc.getSheetByName("Daily Check and Balance");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:[]})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowDateRaw = row[0];
        if (!rowDateRaw) continue;
        var rowDateStr = "";
        if (rowDateRaw instanceof Date) {
          rowDateStr = Utilities.formatDate(rowDateRaw, doc.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        } else {
          rowDateStr = String(rowDateRaw).split('T')[0];
        }
        var rowBranch = row[1];
        var dateMatch = (dateStr === '' || rowDateStr === dateStr);
        var branchMatch = (branchFilter === 'All' || rowBranch === branchFilter);
        if (dateMatch && branchMatch) {
          row[0] = rowDateStr;
          row.push(i + 1);
          results.push(row);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'addWarrantyItem') {
      var sheet = getOrCreateSheet(doc, "Warranty Items", ["RecordedDate","Branch","Tech","ItemDescription","Serial#","PC#","Qty","Issue","SupApprover","Status","Warranty#","ReceivedDate","RMAOffice","ValidationStatus","AssignedTech","Remarks","ReplacementDate","DateReceived","ReplItemDesc","ReplSerial#","SupApprover2","OverallStatus"]);
      var dateStr = params.date || '';
      var branch = params.branch || '';
      var tech = params.tech || '';
      var itemDescription = params.itemDescription || '';
      var serial = params.serial || '';
      var pc = params.pc || '';
      var qty = params.qty || '';
      var issue = params.issue || '';
      var approver = params.approver || '';
      var status = params.status || 'Pending';
      var warrantyNumber = params.warrantyNumber || '';
      var encodedBy = params.encodedBy || 'Unknown';
      sheet.appendRow([dateStr, branch, tech, itemDescription, serial, pc, qty, issue, approver, status, warrantyNumber]);
      logAction(doc, "Add Warranty Item", "Branch: " + branch + ", Item: " + itemDescription + ", Serial: " + serial, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Warranty Record saved successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'addHandover') {
      var sheet = getOrCreateSheet(doc, "Handover", ["Date","Branch","OutgoingStaff","Description","Discussion","Status","IncomingStaff","Remarks","Approver","EncodedBy"]);
      var dateStr = params.date || '';
      var branch = params.branch || '';
      var outgoingStaff = params.outgoingStaff || '';
      var description = params.description || '';
      var discussion = params.discussion || '';
      var status = params.status || 'In Progress';
      var incomingStaff = params.incomingStaff || '';
      var remarks = params.remarks || '';
      var approver = params.approver || '';
      var encodedBy = params.encodedBy || 'Unknown';
      sheet.appendRow([dateStr, branch, outgoingStaff, description, discussion, status, incomingStaff, remarks, approver, encodedBy]);
      logAction(doc, "Add Handover", "Branch: " + branch + ", Outgoing: " + outgoingStaff + ", Incoming: " + incomingStaff, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Handover Record saved successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveItemCategory') {
        var categoryName = params.categoryName;
        var sheet = getOrCreateSheet(doc, "Item Category", ["Category"]);
        sheet.appendRow([categoryName]);
        return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Category saved successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveItemSupplier') {
        var supplierName = params.supplierName;
        var sheet = getOrCreateSheet(doc, "Supplier Name", ["Supplier Name"]);
        sheet.appendRow([supplierName]);
        return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Supplier saved successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'savePurchasedItem') {
        var dateStr = params.date;
        var supplierName = params.supplierName;
        var itemCategory = params.itemCategory;
        var itemDescription = params.itemDescription;
        var serialNumber = params.serialNumber || '';
        var status = params.status;
        var accountablePerson = params.accountablePerson;
        var sheet = getOrCreateSheet(doc, "Item Purchased", ["Date","Supplier Name","Item Category","Item Description","Serial Number","Status","Accountable Person"]);
        sheet.appendRow([dateStr, supplierName, itemCategory, itemDescription, serialNumber, status, accountablePerson]);
        return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Purchased item saved successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveMultiplePurchasedItems') {
        var items = JSON.parse(e.postData.contents).items || [];
        var sheet = getOrCreateSheet(doc, "Item Purchased", ["Date","Supplier Name","Item Category","Item Description","Serial Number","Status","Accountable Person"]);
        if (items.length > 0) {
            var dataToInsert = items.map(function(item) {
                var rawDate = item.date || '';
                var formattedDate = rawDate;
                var d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    var y = d.getFullYear();
                    var m = d.getMonth() + 1;
                    var day = d.getDate();
                    formattedDate = y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
                }
                return ["'" + formattedDate, item.supplierName, item.itemCategory, item.itemDescription, item.serialNumber || '', item.status, item.accountablePerson];
            });
            var lock = LockService.getScriptLock();
            lock.waitLock(30000);
            try {
                // Compute the true last used row from column A specifically, avoiding gaps
                // caused by stray content/formatting elsewhere in the sheet.
                var colAValues = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getValues();
                var lastUsedRow = 1;
                for (var r = colAValues.length - 1; r >= 0; r--) {
                    if (colAValues[r][0] !== '' && colAValues[r][0] !== null) {
                        lastUsedRow = r + 1;
                        break;
                    }
                }
                sheet.getRange(lastUsedRow + 1, 1, dataToInsert.length, 7).setValues(dataToInsert);
            } finally {
                lock.releaseLock();
            }
        }
        return ContentService.createTextOutput(JSON.stringify({status:"success", message:items.length + " items saved successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveStaffSchedule') {
      var rows = params.rows || [];
      var encodedBy = params.encodedBy || 'Unknown';
      var sheet = getOrCreateSheet(doc, "Staff Schedule", ["Date","Branch","Staff Name","Shift Time","Shift Hours","Status","Encoded By"]);
      var now = new Date();
      var toAppend = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        toAppend.push([r.date, r.branch, r.staffName, r.shiftTime || '', r.shiftHours, r.status, encodedBy]);
      }
      if (toAppend.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 7).setValues(toAppend);
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", count: toAppend.length})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveCustomerInfo') {
      var sheet = getOrCreateSheet(doc, "Customer Information Sheet", [
        "Date","Customer Name","Address","Mobile#","Number of Builds","Type of Build",
        "Delivery Date","Delivery Method","Shipping Fee","Free Shipping Justification","Free Shipping Screenshot URL",
        "Downpayment Amount","Reference Number","DP MOP","Tech Builder","Sales Admin","MarvsPC Page","Client Request",
        "Build Status","Payment Completion","Delivery Status","Overall Status","Encoded By"
      ]);

      var screenshotUrl = '';
      if (params.screenshotData && params.screenshotData !== '') {
        try {
          var decodedData = Utilities.base64Decode(params.screenshotData);
          var mimeType = params.screenshotMimeType || 'image/png';
          var fileName = params.screenshotFileName || 'free_shipping_justification.png';
          var blob = Utilities.newBlob(decodedData, mimeType, fileName);
          var folderName = "Customer Info Free Shipping Screenshots";
          var folders = DriveApp.getFoldersByName(folderName);
          var folder;
          if (folders.hasNext()) {
            folder = folders.next();
          } else {
            folder = DriveApp.createFolder(folderName);
          }
          var file = folder.createFile(blob);
          screenshotUrl = file.getUrl();
        } catch (uploadError) {
          return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Error uploading screenshot: " + uploadError.toString()})).setMimeType(ContentService.MimeType.JSON);
        }
      }

      sheet.appendRow([
        params.date || '',
        params.customerName || '',
        params.address || '',
        params.mobile || '',
        params.numberOfBuilds || '',
        params.typeOfBuild || '',
        params.deliveryDate || '',
        params.deliveryMethod || '',
        params.shippingFee || '0',
        params.shippingJustification || '',
        screenshotUrl,
        params.downpayment || '',
        params.referenceNumber || '',
        params.dpMop || '',
        params.techBuilder || '',
        params.salesAdmin || '',
        params.marvspcPage || '',
        params.clientRequest || '',
        params.buildStatus || 'Pending',
        params.paymentCompletion || 'Pending',
        params.deliveryStatus || 'Pending',
        params.overallStatus || 'Pending',
        params.encodedBy || 'Unknown'
      ]);

      logAction(doc, "Customer Info Added", "Added customer: " + (params.customerName || ''), params.encodedBy || 'Unknown');
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Customer information saved successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'saveDailySurvey') {
      var dateStr = params.date;
      var branch = params.branch;
      var timeStr = "'" + params.time;
      var count = params.count;
      var encodedBy = params.encodedBy;
      var sheet = getOrCreateSheet(doc, "Daily Survey", ["Date","Branch","Time","Count","Loggedin"]);
      sheet.appendRow([dateStr, branch, timeStr, count, encodedBy]);
      return ContentService.createTextOutput(JSON.stringify({status:"success"})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getDailySurveyReport') {
      var dateStr = params.date || '';
      var sheet = doc.getSheetByName("Daily Survey");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:[]})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowDateRaw = row[0];
        if (!rowDateRaw) continue;
        var rowDateStr = "";
        if (Object.prototype.toString.call(rowDateRaw) === "[object Date]" && !isNaN(rowDateRaw)) {
          var y = rowDateRaw.getFullYear();
          var m = ('0' + (rowDateRaw.getMonth() + 1)).slice(-2);
          var d = ('0' + rowDateRaw.getDate()).slice(-2);
          rowDateStr = y + "-" + m + "-" + d;
        } else {
          rowDateStr = String(rowDateRaw).split('T')[0];
        }
        if (dateStr === '' || rowDateStr === dateStr) {
          row[0] = rowDateStr;
          if (Object.prototype.toString.call(row[2]) === "[object Date]" && !isNaN(row[2])) {
            var hh = ('0' + row[2].getHours()).slice(-2);
            var mm = ('0' + row[2].getMinutes()).slice(-2);
            row[2] = hh + ":" + mm;
          }
          results.push(row);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getDailyRecordsByRange') {
      var startDateStr = params.startDate || '';
      var endDateStr = params.endDate || '';
      var branchFilter = params.branch || 'All';
      var sheet = doc.getSheetByName("Daily Check and Balance");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:[]})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowDateRaw = row[0];
        if (!rowDateRaw) continue;
        var rowDateStr = "";
        if (rowDateRaw instanceof Date) {
          rowDateStr = Utilities.formatDate(rowDateRaw, doc.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        } else {
          rowDateStr = String(rowDateRaw).split('T')[0];
        }
        var rowBranch = row[1];
        if (startDateStr !== '' && rowDateStr < startDateStr) continue;
        if (endDateStr !== '' && rowDateStr > endDateStr) continue;
        if (branchFilter !== 'All' && rowBranch !== branchFilter) continue;
        row[0] = rowDateStr;
        results.push(row);
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getReconciliationData') {
      var startDateStr = params.startDate || '';
      var endDateStr = params.endDate || '';
      var branchFilter = params.branch || 'All';
      var totals = {
        cashExpense: 0,
        gcashExpense: 0,
        gcashReceivable: 0,
        cashOnHand: 0,
        cashExpenseRows: [],
        gcashExpenseRows: [],
        gcashReceivableRows: [],
        cashOnHandRows: [],
        pondoAmount: null,
        discrepancyStr: null,
        remarks: null
      };
      var configs = [
        { sheetName: 'Cash Expenses', amountIdx: 3, dateIdx: 1, branchIdx: 0, key: 'cashExpense' },
        { sheetName: 'Gcash Expenses', amountIdx: 4, dateIdx: 1, branchIdx: 0, key: 'gcashExpense' },
        { sheetName: 'Gcash Receivable', amountIdx: 6, dateIdx: 1, branchIdx: 0, key: 'gcashReceivable' },
        { sheetName: 'Cash on Hand', amountIdx: 2, dateIdx: 1, branchIdx: 0, key: 'cashOnHand' }
      ];
      for (var c = 0; c < configs.length; c++) {
        var cfg = configs[c];
        var sheet = doc.getSheetByName(cfg.sheetName);
        if (sheet) {
          var data = sheet.getDataRange().getValues();
          for (var i = 1; i < data.length; i++) {
            var row = data[i];
            var rowDateRaw = row[cfg.dateIdx];
            if (!rowDateRaw) continue;
            var rowDateStr = "";
            if (Object.prototype.toString.call(rowDateRaw) === "[object Date]" && !isNaN(rowDateRaw)) {
              var y = rowDateRaw.getFullYear();
              var m = rowDateRaw.getMonth() + 1;
              var d = rowDateRaw.getDate();
              rowDateStr = y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
            } else {
              try {
                rowDateStr = Utilities.formatDate(new Date(rowDateRaw), Session.getScriptTimeZone(), "yyyy-MM-dd");
              } catch(e) {
                rowDateStr = rowDateRaw.toString().split('T')[0];
              }
            }
            if (startDateStr !== '' && rowDateStr < startDateStr) continue;
            if (endDateStr !== '' && rowDateStr > endDateStr) continue;
            if (branchFilter !== 'All') {
              if (row[cfg.branchIdx] !== branchFilter) continue;
            }
            row[cfg.dateIdx] = rowDateStr;
            var amt = parseFloat(row[cfg.amountIdx]) || 0;
            totals[cfg.key] += amt;
            totals[cfg.key + 'Rows'].push(row);
          }
        }
      }
      var dcbSheet = doc.getSheetByName("Daily Check and Balance");
      if (dcbSheet) {
        var dcbData = dcbSheet.getDataRange().getValues();
        for (var i = dcbData.length - 1; i > 0; i--) {
          var row = dcbData[i];
          var rowDateRaw = row[0];
          if (!rowDateRaw) continue;
          var rowDateStr = "";
          if (Object.prototype.toString.call(rowDateRaw) === "[object Date]" && !isNaN(rowDateRaw)) {
            var y = rowDateRaw.getFullYear();
            var m = rowDateRaw.getMonth() + 1;
            var d = rowDateRaw.getDate();
            rowDateStr = y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
          } else {
            try {
              rowDateStr = Utilities.formatDate(new Date(rowDateRaw), Session.getScriptTimeZone(), "yyyy-MM-dd");
            } catch(e) {
              rowDateStr = rowDateRaw.toString().split('T')[0];
            }
          }
          if (rowDateStr === startDateStr && row[1] === branchFilter) {
            totals.pondoAmount = parseFloat(row[7]) || 0;
            totals.discrepancyStr = row[8] || '';
            totals.remarks = row[9] || '';
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:totals})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'getMonthlyIncome') {
      var startDateStr = params.startDate || '';
      var endDateStr = params.endDate || '';
      var branchFilter = params.branch || 'All';
      var sheet = doc.getSheetByName("Daily Check and Balance");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Could not find tab 'Daily Check and Balance'"})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var totals = {
        cashExpense: 0,
        gcashExpenses: 0,
        gcashReceivable: 0,
        cashOnHand: 0,
        dailySales: 0,
        pondoAmount: 0,
        discrepancy: 0
      };
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowDateRaw = row[0];
        if (!rowDateRaw) continue;
        var rowDateStr = "";
        if (Object.prototype.toString.call(rowDateRaw) === "[object Date]" && !isNaN(rowDateRaw)) {
          var y = rowDateRaw.getFullYear();
          var m = ('0' + (rowDateRaw.getMonth() + 1)).slice(-2);
          var d = ('0' + rowDateRaw.getDate()).slice(-2);
          rowDateStr = y + '-' + m + '-' + d;
        } else {
          rowDateStr = String(rowDateRaw).split('T')[0];
        }
        var rowBranch = row[1];
        var dateMatch = (rowDateStr >= startDateStr && rowDateStr <= endDateStr);
        var branchMatch = (branchFilter === 'All' || rowBranch === branchFilter);
        if (dateMatch && branchMatch) {
          totals.cashExpense += parseFloat(row[2]) || 0;
          totals.gcashExpenses += parseFloat(row[3]) || 0;
          totals.gcashReceivable += parseFloat(row[4]) || 0;
          totals.cashOnHand += parseFloat(row[5]) || 0;
          totals.dailySales += parseFloat(row[6]) || 0;
          totals.pondoAmount += parseFloat(row[7]) || 0;
          var disc = row[8];
          // FIXED: Now handles 'Balanced', 'Balance', 'balance'
          var discStr = String(disc).toLowerCase();
          if (discStr.includes('balance')) {
             // 0 discrepancy
          } else {
             totals.discrepancy += parseFloat(disc) || 0;
          }
        }
      }
      totals.salaryExpenses = 0;
      var salarySheet = doc.getSheetByName("Other Expenses");
      if (salarySheet) {
          var salaryData = salarySheet.getDataRange().getValues();
          for (var j = 1; j < salaryData.length; j++) {
              var sRow = salaryData[j];
              var sRowDateRaw = sRow[1];
              if (!sRowDateRaw) continue;
              var sRowDateStr = "";
              if (Object.prototype.toString.call(sRowDateRaw) === "[object Date]" && !isNaN(sRowDateRaw)) {
                var sy = sRowDateRaw.getFullYear();
                var sm = ('0' + (sRowDateRaw.getMonth() + 1)).slice(-2);
                var sd = ('0' + sRowDateRaw.getDate()).slice(-2);
                sRowDateStr = sy + '-' + sm + '-' + sd;
              } else {
                sRowDateStr = String(sRowDateRaw).split('T')[0];
              }
              var sBranch = sRow[2];
              var sDateMatch = (sRowDateStr >= startDateStr && sRowDateStr <= endDateStr);
              var sBranchMatch = (branchFilter === 'All' || sBranch === branchFilter);
              if (sDateMatch && sBranchMatch) {
                  var rowTotal = 0;
                  for (var k = 3; k <= 9; k++) {
                      rowTotal += parseFloat(sRow[k]) || 0;
                  }
                  totals.salaryExpenses += rowTotal;
              }
          }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:totals})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "saveMonthlyIncome") {
      var sheet = getOrCreateSheet(doc, "Monthly Income", ["StartDate","EndDate","Branch","CashExpense","GcashExpense","GcashReceivable","CashOnHand","SalaryExpenses","MonthlySales","PondoAmount","MonthlyExpenses","TotalNetIncome","EncodedBy"]);
      sheet.appendRow([params.startDate || "", params.endDate || "", params.branch || "", params.cashExpense || 0, params.gcashExpense || 0, params.gcashReceivable || 0, params.cashOnHand || 0, params.salaryExpenses || 0, params.monthlySales || 0, params.pondoAmount || 0, params.monthlyExpenses || 0, params.totalNetIncome || 0, params.encodedBy || '']);
      var encodedBy = params.encodedBy || 'Unknown';
      logAction(doc, "Save Monthly Income", "Saved monthly income for " + (params.branch || "All") + " (" + (params.startDate || "") + " to " + (params.endDate || "") + ")", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Monthly income record saved successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "getExpenseRecords") {
      var sheetName = params.sheetName || "";
      var startDateStr = params.startDate || "";
      var endDateStr = params.endDate || "";
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:[]})).setMimeType(ContentService.MimeType.JSON);
      }
      if (sheetName === "Manual Quotation") {
        // Fix 21: make sure a list-view load never sees a still-unmigrated
        // pre-Fix-21 header (missing "Quotation #") even if nobody has saved a
        // new quotation since redeploying -- same migration saveManualQuotation runs.
        ensureQuotationNumberColumn(sheet);
      }
      var branchFilter = params.branch || "All";
      var supplierFilter = params.supplier || "All";
      var categoryFilter = params.category || "All";
      var statusFilter = params.status || "All";
      var cache = CacheService.getScriptCache();
      var cacheKey = "getExpenseRecords_" + sheetName + "_" + startDateStr + "_" + endDateStr + "_" + branchFilter + "_" + supplierFilter + "_" + categoryFilter + "_" + statusFilter;
      if (cacheKey.length > 250) {
          cacheKey = cacheKey.substring(0, 250);
      }
      var cachedData = params.noCache ? null : cache.get(cacheKey);
      if (cachedData) {
          return ContentService.createTextOutput(JSON.stringify({status:"success", data:JSON.parse(cachedData)})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        // "Deliveries" has no Date column at all (Location, Delivery Method, Cost only) —
        // skip the date-range filtering path entirely and just return every non-blank row.
        if (sheetName === "Deliveries") {
          if (!row[0] && !row[1] && !row[2]) continue;
          row.push(i + 1);
          results.push(row);
          continue;
        }
        var dateIndex = 0;
        var branchIndex = -1;
        if (sheetName === "Cash Expenses" || sheetName === "Gcash Expenses" || sheetName === "Gcash Receivable" || sheetName === "Cash on Hand") {
            dateIndex = 1;
            branchIndex = 0;
        } else if (sheetName === "Remitted amount") {
            dateIndex = 0;
            branchIndex = 5;
        } else if (sheetName === "Other Expenses") {
            dateIndex = 1;
            branchIndex = 2;
        } else if (sheetName === "Warranty Items") {
            dateIndex = 0;
            branchIndex = 1;
        } else if (sheetName === "Handover") {
            dateIndex = 0;
            branchIndex = 1;
        } else if (sheetName === "Item Purchased") {
            dateIndex = 0;
            branchIndex = -1;
        } else if (sheetName === "Daily Check and Balance") {
            dateIndex = 0;
            branchIndex = 1;
        } else if (sheetName === "Manual Quotation") {
            // Fix 21: column A is now "Quotation #" (see ensureQuotationNumberColumn),
            // so Date shifted to column B (index 1). No Branch column on this sheet.
            dateIndex = 1;
            branchIndex = -1;
        }
        var rowDateRaw = row[dateIndex];
        if (!rowDateRaw) continue;
        if (branchFilter !== "All" && branchIndex !== -1) {
            if (row[branchIndex] !== branchFilter) {
                continue;
            }
        }
        if (sheetName === "Item Purchased") {
            var supplier = row[1] ? row[1].toString().trim() : "";
            var category = row[2] ? row[2].toString().trim() : "";
            var status = row[5] ? row[5].toString().trim() : "";
            if (supplierFilter !== "All" && supplier !== supplierFilter) continue;
            if (categoryFilter !== "All" && category !== categoryFilter) continue;
            if (statusFilter !== "All" && status !== statusFilter) continue;
        }
        var rowDateStr = "";
        if (Object.prototype.toString.call(rowDateRaw) === "[object Date]" && !isNaN(rowDateRaw)) {
          var y = rowDateRaw.getFullYear();
          var m = ('0' + (rowDateRaw.getMonth() + 1)).slice(-2);
          var d = ('0' + rowDateRaw.getDate()).slice(-2);
          rowDateStr = y + "-" + m + "-" + d;
        } else {
          rowDateStr = String(rowDateRaw).split('T')[0];
        }
        if (rowDateStr >= startDateStr && rowDateStr <= endDateStr) {
          row[dateIndex] = rowDateStr;
          for (var j = 0; j < row.length; j++) {
             if (j !== dateIndex && Object.prototype.toString.call(row[j]) === "[object Date]" && !isNaN(row[j])) {
                var y2 = row[j].getFullYear();
                var m2 = ('0' + (row[j].getMonth() + 1)).slice(-2);
                var d2 = ('0' + row[j].getDate()).slice(-2);
                var hh = ('0' + row[j].getHours()).slice(-2);
                var mm = ('0' + row[j].getMinutes()).slice(-2);
                var ss = ('0' + row[j].getSeconds()).slice(-2);
                row[j] = y2 + "-" + m2 + "-" + d2 + " " + hh + ":" + mm + ":" + ss;
             }
          }
          row.push(i + 1);
          results.push(row);
        }
      }
      try {
          var resultsString = JSON.stringify(results);
          cache.put(cacheKey, resultsString, 60);
      } catch(e) {}
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "getItemCategories") {
        var sheet = doc.getSheetByName("Item Category");
        var results = [];
        if (sheet) {
            var data = sheet.getDataRange().getValues();
            for (var i = 1; i < data.length; i++) {
                if (data[i][0]) results.push(data[i][0].toString().trim());
            }
        }
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "getItemSuppliers") {
        var sheet = doc.getSheetByName("Supplier Name");
        var results = [];
        if (sheet) {
            var data = sheet.getDataRange().getValues();
            for (var i = 1; i < data.length; i++) {
                if (data[i][0]) results.push(data[i][0].toString().trim());
            }
        }
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "getAuditLogs") {
      var sheet = doc.getSheetByName("Audit Logs");
      var results = [];
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          results.push(data[i]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:results.reverse()})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "updateItemReplacement") {
      var sheetName = "Warranty Items";
      var rowIndex = parseInt(params.rowIndex);
      var replacementData = params.replacementData || [];
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet || isNaN(rowIndex) || rowIndex < 2) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid sheet or row index"})).setMimeType(ContentService.MimeType.JSON);
      }
      if (replacementData.length !== 5) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Replacement data must contain exactly 5 fields"})).setMimeType(ContentService.MimeType.JSON);
      }
      var maxCols = sheet.getMaxColumns();
      if (maxCols < 22) {
        sheet.insertColumnsAfter(maxCols, 22 - maxCols);
      }
      var range = sheet.getRange(rowIndex, 18, 1, 5);
      range.setValues([replacementData]);
      var encodedBy = params.encodedBy || 'Unknown';
      logAction(doc, "Item Replacement", "Processed item replacement at row " + rowIndex, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Item replacement updated successfully!"})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "updateWarrantyValidation") {
      var sheetName = "Warranty Items";
      var rowIndex = parseInt(params.rowIndex);
      var validationData = params.validationData || [];
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet || isNaN(rowIndex) || rowIndex < 2) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid sheet or row index"})).setMimeType(ContentService.MimeType.JSON);
      }
      if (validationData.length !== 6) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Validation data must contain exactly 6 fields"})).setMimeType(ContentService.MimeType.JSON);
      }
      var maxCols = sheet.getMaxColumns();
      if (maxCols < 17) {
        sheet.insertColumnsAfter(maxCols, 17 - maxCols);
      }
      var range = sheet.getRange(rowIndex, 12, 1, 6);
      range.setValues([validationData]);
      var encodedBy = params.encodedBy || 'Unknown';
      logAction(doc, "Update Validation", "Updated validation details at row " + rowIndex, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Validation updated successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "updateExpenseRecord") {
      var sheetName = params.sheetName || "";
      var rowIndex = parseInt(params.rowIndex);
      var updatedData = params.updatedData || [];
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet || isNaN(rowIndex) || rowIndex < 2) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Invalid sheet or row index"})).setMimeType(ContentService.MimeType.JSON);
      }
      var range = sheet.getRange(rowIndex, 1, 1, updatedData.length);
      range.setValues([updatedData]);
      var encodedBy = params.encodedBy || 'Unknown';
      logAction(doc, "Edit Record", "Edited record at row " + rowIndex + " in " + sheetName, encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Record updated successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "saveSupplierPrices") {
      var sheetName = "Supplier Prices";
      var items = params.items || [];
      var sheet = getOrCreateSheet(doc, sheetName, ["Item Name","Supplier","Cost Price","Last Updated"]);
      var dataToWrite = items.map(function(item) {
        return [item.itemName, item.supplier, item.cost, item.lastUpdated];
      });
      if (dataToWrite.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, dataToWrite.length, 4).setValues(dataToWrite);
      }
      var encodedBy = params.encodedBy || 'Unknown';
      logAction(doc, "Upload Supplier Prices", "Uploaded " + dataToWrite.length + " items", encodedBy);
      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"Prices saved successfully"})).setMimeType(ContentService.MimeType.JSON);

    } else if (params.action === "getSupplierPrices") {
      var sheetName = "Supplier Prices";
      var sheet = doc.getSheetByName(sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({status:"success", data:[]})).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var results = [];
      if (data.length > 1) {
        for (var i = 1; i < data.length; i++) {
          results.push(data[i]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status:"success", data:results})).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'timeIn') {
      return handleTimeIn(params);

    } else if (action === 'timeOut') {
      return handleTimeOut(params);

    } else if (action === 'getAttendanceToday') {
      return getAttendanceToday();

    } else if (action === 'getAllAttendance') {
      return getAllAttendance();

    } else if (action === 'deleteAttendance') {
      return deleteAttendance(params);

    } else if (action === 'getEmployeeList') {
      return getEmployeeList();

    } else {
      return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Unknown action: " + action})).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message:error.toString() + " Stack: " + error.stack})).setMimeType(ContentService.MimeType.JSON);
  }
}

function setup() {
  DriveApp.getRootFolder();
  DriveApp.createFile('dummy', 'dummy'); 
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
