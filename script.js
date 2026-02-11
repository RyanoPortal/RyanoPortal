// ======================================================
// === CONFIGURATION ====================================
// ======================================================

// IMPORTANT: After re-deploying Apps Script, update this URL with your NEW Web App URL
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbytDZ27z_nUNRUYgF2dM7xJ9iRR6Cw-RG5Ykvot1hhyRpKgY4suJuhw4Lq4HKm39mXC/exec";

const users = [
    { id: "driver1", password: "1234", role: "driver" },
    { id: "Mike Mike", password: "2024", role: "driver" },
    { id: "Big B", password: "8183", role: "driver" },
    { id: "manager1", password: "5678", role: "manager" },
    { id: "B Mgr", password: "0516", role: "manager" }
];

// ======================================================
// === STATE MANAGEMENT =================================
// ======================================================

let currentUser = null;

// ======================================================
// === DOM REFERENCES ===================================
// ======================================================

const loginOverlay = document.getElementById("login-overlay");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginError = document.getElementById("loginError");
const employeeIdInput = document.getElementById("employeeId");
const passwordInput = document.getElementById("password");
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");
const userRoleLabel = document.getElementById("userRoleLabel");
const userIdLabel = document.getElementById("userIdLabel");
const darkModeToggle = document.getElementById("darkModeToggle");
const tripForm = document.getElementById("tripForm");
const addStopRowBtn = document.getElementById("addStopRow");
const removeStopRowBtn = document.getElementById("removeStopRow");
const stopsTableBody = document.querySelector("#stopsTable tbody");
const totalMilesSpan = document.getElementById("totalMiles");
const totalWaitSpan = document.getElementById("totalWait");
const tripMessage = document.getElementById("tripMessage");
const driverStartDateInput = document.getElementById("driverStartDate");
const driverEndDateInput = document.getElementById("driverEndDate");
const loadDriverTripsBtn = document.getElementById("loadDriverTrips");
const driverTripsBody = document.getElementById("driverTripsBody");
const driverTotalTripsSpan = document.getElementById("driverTotalTrips");
const driverTotalHoursSpan = document.getElementById("driverTotalHours");

// ======================================================
// === INITIALIZATION ===================================
// ======================================================

document.addEventListener('DOMContentLoaded', function() {
    // Set default dates for dashboard
    setDefaultDates();
    
    // Check for saved user
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            loginOverlay.style.display = "none";
            userRoleLabel.textContent = `Role: ${currentUser.role}`;
            userIdLabel.textContent = `User: ${currentUser.id}`;
            
            // Auto-populate driver name
            const driverNameInput = document.getElementById("driverName");
            if (driverNameInput) {
                driverNameInput.value = currentUser.id;
                driverNameInput.readOnly = true;
            }
            
            applyRoleUI();
            showView("dashboard");
        } catch {
            localStorage.removeItem('currentUser');
        }
    }
    
    // Check for dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
});

function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    driverStartDateInput.value = formatDateForInput(firstDay);
    driverEndDateInput.value = formatDateForInput(today);
    
    // Set trip date to today by default
    const tripDateInput = document.getElementById("tripdate");
    if (tripDateInput) {
        tripDateInput.value = formatDateForInput(today);
    }
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ======================================================
// === AUTHENTICATION ===================================
// ======================================================

loginButton.addEventListener("click", () => {
    const id = employeeIdInput.value.trim();
    const pw = passwordInput.value.trim();

    const user = users.find(u => u.id === id && u.password === pw);
    if (!user) {
        loginError.textContent = "Invalid ID or password.";
        return;
    }

    currentUser = { id: user.id, role: user.role };
    loginError.textContent = "";
    loginOverlay.style.display = "none";

    userRoleLabel.textContent = `Role: ${currentUser.role}`;
    userIdLabel.textContent = `User: ${currentUser.id}`;

    // Auto-populate driver name
    const driverNameInput = document.getElementById("driverName");
    if (driverNameInput) {
        driverNameInput.value = currentUser.id;
        driverNameInput.readOnly = true;
    }

    // Save user to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    applyRoleUI();
    showView("dashboard");
    setDefaultDates();
});

logoutButton.addEventListener("click", () => {
    currentUser = null;
    loginOverlay.style.display = "flex";
    employeeIdInput.value = "";
    passwordInput.value = "";
    userRoleLabel.textContent = "";
    userIdLabel.textContent = "";

    // Clear driver name field
    const driverNameInput = document.getElementById("driverName");
    if (driverNameInput) {
        driverNameInput.value = "";
        driverNameInput.readOnly = false;
    }

    // Clear localStorage
    localStorage.removeItem('currentUser');
    
    navButtons.forEach(b => b.classList.remove("active"));
    const dashBtn = document.querySelector('.nav-btn[data-view="dashboard"]');
    if (dashBtn) dashBtn.classList.add("active");
    showView("dashboard");
});

// ======================================================
// === ROLE-BASED UI ====================================
// ======================================================

function applyRoleUI() {
    if (!currentUser) return;
    const isDriver = currentUser.role === "driver";
    const dbBtn = document.querySelector('[data-view="database"]');
    const sheetBtn = document.querySelector('[data-view="spreadsheet"]');

    if (isDriver) {
        if (dbBtn) dbBtn.style.display = "none";
        if (sheetBtn) sheetBtn.style.display = "none";
    } else {
        if (dbBtn) dbBtn.style.display = "inline-block";
        if (sheetBtn) sheetBtn.style.display = "inline-block";
    }
}

// ======================================================
// === NAVIGATION =======================================
// ======================================================

navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        if (!view) return;
        if (currentUser && currentUser.role === "driver") {
            if (view === "database" || view === "spreadsheet") return;
        }
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        showView(view);
    });
});

function showView(viewName) {
    views.forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove("hidden");
    
    // Load data for specific views
    if (viewName === "database" && currentUser?.role === "manager") {
        loadDatabaseView();
    } else if (viewName === "spreadsheet" && currentUser?.role === "manager") {
        loadSpreadsheetView();
    }
}

// ======================================================
// === DARK MODE ========================================
// ======================================================

darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// ======================================================
// === STOP MANAGEMENT ==================================
// ======================================================

addStopRowBtn.addEventListener("click", () => {
    const lastRow = stopsTableBody.lastElementChild;
    const newRow = lastRow.cloneNode(true);
    const newIndex = stopsTableBody.children.length + 1;
    newRow.querySelector(".stop-number").textContent = newIndex;
    newRow.querySelector(".stop-times").value = "";
    newRow.querySelector(".stop-location").value = "";
    newRow.querySelector(".stop-odometer").value = "";
    newRow.querySelector(".stop-why").value = "";
    newRow.querySelector(".stop-wait").value = "0";
    stopsTableBody.appendChild(newRow);
});

removeStopRowBtn.addEventListener("click", () => {
    if (stopsTableBody.children.length > 1) {
        stopsTableBody.removeChild(stopsTableBody.lastElementChild);
    }
    updateTotals();
});

function updateTotals() {
    let totalWait = 0;
    document.querySelectorAll(".stop-wait").forEach(input => {
        totalWait += parseFloat(input.value) || 0;
    });
    totalWaitSpan.textContent = totalWait.toString();

    const startOdometer = parseFloat(document.getElementById("startOdometer").value) || 0;
    const dropcrewOdometer = parseFloat(document.getElementById("dropcrewOdometer").value) || 0;
    const miles = dropcrewOdometer - startOdometer;
    totalMilesSpan.textContent = miles > 0 ? miles.toString() : "0";
}

document.getElementById("startOdometer").addEventListener("input", updateTotals);
document.getElementById("dropcrewOdometer").addEventListener("input", updateTotals);

stopsTableBody.addEventListener("input", e => {
    if (e.target.classList.contains("stop-wait")) updateTotals();
});

function collectStops() {
    const stops = [];
    document.querySelectorAll("#stopsTable tbody tr").forEach((row, index) => {
        const times = row.querySelector(".stop-times").value.trim();
        const location = row.querySelector(".stop-location").value.trim();
        const odometer = row.querySelector(".stop-odometer").value.trim();
        const why = row.querySelector(".stop-why").value.trim();
        const wait = parseFloat(row.querySelector(".stop-wait").value) || 0;
        if (times || location || odometer || why || wait > 0) {
            stops.push({ index: index + 1, times, location, odometer, why, wait });
        }
    });
    return stops;
}

// ======================================================
// === TRIP SUBMISSION ==================================
// ======================================================

tripForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showTripMessage("You must be logged in.", "error");
        return;
    }

    const trip = {
        driverName: document.getElementById("driverName").value.trim(),
        tripdate: document.getElementById("tripdate").value.trim(),
        vanID: document.getElementById("vanID").value.trim(),
        startOdometer: document.getElementById("startOdometer").value.trim(),
        rrNumber: document.getElementById("rrNumber").value.trim(),
        hallconNumber: document.getElementById("hallconNumber").value.trim(),
        tripType: document.getElementById("tripType").value.trim(),
        crewNames: document.getElementById("crewNames").value.trim(),
        destination: document.getElementById("destination").value.trim(),
        dispatcher: document.getElementById("dispatcher").value.trim(),
        stops: collectStops(),
        dropcrewOdometer: document.getElementById("dropcrewOdometer").value.trim(),
        dropcrewTime: document.getElementById("dropcrewTime").value.trim(),
        totalMiles: totalMilesSpan.textContent,
        totalWait: totalWaitSpan.textContent,
        clockIn: document.getElementById("clockIn").value.trim(),
        clockOut: document.getElementById("clockOut").value.trim(),
        notes: document.getElementById("notes").value.trim(),
        submittedAt: new Date().toISOString()
    };

    if (!trip.driverName || !trip.tripdate || !trip.vanID) {
        showTripMessage("Please fill in Driver Name, Trip Date, and Van ID.", "error");
        return;
    }

    showTripMessage("Submitting trip...", "loading");

    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ mode: "appendTrip", trip })
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("Submission result:", result);
        
        if (result.success) {
            showTripMessage("Trip submitted successfully!", "success");
            
            // Save for preview before resetting
            saveTripForPreview(trip);
            
            // Reset form but keep driver name
            const driverName = document.getElementById("driverName").value;
            tripForm.reset();
            document.getElementById("driverName").value = driverName;
            document.getElementById("driverName").readOnly = true;
            
            // Reset trip date to today
            document.getElementById("tripdate").value = formatDateForInput(new Date());
            
            totalMilesSpan.textContent = "0";
            totalWaitSpan.textContent = "0";
            
            // Reset stops table to 1 row
            while (stopsTableBody.children.length > 1) {
                stopsTableBody.removeChild(stopsTableBody.lastElementChild);
            }
            // Reset stop number
            if (stopsTableBody.firstElementChild) {
                stopsTableBody.firstElementChild.querySelector(".stop-number").textContent = "1";
            }
            
        } else {
            throw new Error(result.error || "Submission failed");
        }
    } catch (err) {
        console.error("Submission error:", err);
        showTripMessage(`Error: ${err.message}`, "error");
    }
});

function showTripMessage(message, type) {
    tripMessage.textContent = message;
    tripMessage.className = "status-message";
    
    switch(type) {
        case "error":
            tripMessage.style.color = "#ff6b6b";
            break;
        case "success":
            tripMessage.style.color = "#51cf66";
            break;
        case "loading":
            tripMessage.style.color = "#ffd43b";
            break;
        default:
            tripMessage.style.color = "#868e96";
    }
}

// ======================================================
// === TRIP PREVIEW =====================================
// ======================================================

function saveTripForPreview(trip) {
    const previewTrip = {
        driverName: trip.driverName,
        tripDate: trip.tripdate,
        tripType: trip.tripType,
        vanId: trip.vanID,
        rrNumber: trip.rrNumber,
        hallconNumber: trip.hallconNumber,
        crewNames: trip.crewNames,
        destination: trip.destination,
        dispatcher: trip.dispatcher,
        stops: trip.stops,
        notes: trip.notes,
        dropCrewTime: trip.dropcrewTime,
        endOdometer: trip.dropcrewOdometer,
        totalWait: trip.totalWait,
        totalMiles: trip.totalMiles,
        clockIn: trip.clockIn,
        clockOut: trip.clockOut
    };
    
    localStorage.setItem('lastTrip', JSON.stringify(previewTrip));
}

// Add preview button event listener
document.addEventListener('DOMContentLoaded', () => {
    const previewBtn = document.getElementById('previewTrip');
    if (previewBtn) {
        previewBtn.addEventListener('click', openTripPreview);
    }
});

function openTripPreview() {
    // Collect current form data
    const trip = {
        driverName: document.getElementById("driverName").value.trim(),
        tripDate: document.getElementById("tripdate").value.trim(),
        tripType: document.getElementById("tripType").value.trim(),
        vanId: document.getElementById("vanID").value.trim(),
        rrNumber: document.getElementById("rrNumber").value.trim(),
        hallconNumber: document.getElementById("hallconNumber").value.trim(),
        crewNames: document.getElementById("crewNames").value.trim(),
        destination: document.getElementById("destination").value.trim(),
        dispatcher: document.getElementById("dispatcher").value.trim(),
        stops: collectStops(),
        notes: document.getElementById("notes").value.trim(),
        dropCrewTime: document.getElementById("dropcrewTime").value.trim(),
        endOdometer: document.getElementById("dropcrewOdometer").value.trim(),
        totalWait: totalWaitSpan.textContent,
        totalMiles: totalMilesSpan.textContent,
        clockIn: document.getElementById("clockIn").value.trim(),
        clockOut: document.getElementById("clockOut").value.trim()
    };
    
    // Validate required fields
    if (!trip.driverName || !trip.tripDate || !trip.vanId) {
        alert("Please fill in Driver Name, Trip Date, and Van ID before previewing.");
        return;
    }
    
    saveTripForPreview(trip);
    window.open('trip-sheet-preview.html', '_blank', 'width=900,height=1000');
}

// ======================================================
// === DRIVER DASHBOARD =================================
// ======================================================

loadDriverTripsBtn.addEventListener("click", loadDriverDashboard);

async function loadDriverDashboard() {
    if (!currentUser) {
        alert("You must be logged in.");
        return;
    }

    const startDate = driverStartDateInput.value;
    const endDate = driverEndDateInput.value;
    
    if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
    }

    driverTripsBody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                mode: "fetchDriverTrips", 
                driverId: currentUser.id, 
                startDate, 
                endDate 
            })
        });

        console.log("Dashboard response status:", response.status);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("Dashboard result:", result);
        
        const trips = result.trips || [];

        driverTripsBody.innerHTML = "";
        
        if (trips.length === 0) {
            driverTripsBody.innerHTML = "<tr><td colspan='5'>No trips found for this date range.</td></tr>";
            driverTotalTripsSpan.textContent = "0";
            driverTotalHoursSpan.textContent = "0.00";
            return;
        }

        let totalTrips = 0;
        let totalHours = 0;

        trips.forEach(trip => {
            totalTrips++;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${trip.tripDate || ""}</td>
                <td>${trip.clockIn || ""}</td>
                <td>${trip.clockOut || ""}</td>
                <td>${trip.totalMiles || 0}</td>
                <td>${trip.totalWait || 0}</td>
            `;
            driverTripsBody.appendChild(row);
            
            if (trip.clockIn && trip.clockOut) {
                totalHours += estimateHours(trip.tripDate, trip.clockIn, trip.clockOut);
            }
        });

        driverTotalTripsSpan.textContent = totalTrips.toString();
        driverTotalHoursSpan.textContent = totalHours.toFixed(2);
    } catch (err) {
        console.error("Dashboard error:", err);
        driverTripsBody.innerHTML = `<tr><td colspan='5'>Error loading trips: ${err.message}</td></tr>`;
    }
}

function estimateHours(dateStr, startTime, endTime) {
    try {
        const start = new Date(`${dateStr}T${startTime}`);
        const end = new Date(`${dateStr}T${endTime}`);
        const diffMs = end - start;
        return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    } catch { 
        return 0; 
    }
}

// ======================================================
// === MANAGER VIEWS ====================================
// ======================================================

async function loadDatabaseView() {
    const databaseBody = document.getElementById("databaseBody");
    if (!databaseBody) return;
    
    databaseBody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";
    
    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ mode: "fetchAllTrips" })
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const result = await response.json();
        const trips = result.trips || [];
        
        databaseBody.innerHTML = "";
        
        if (trips.length === 0) {
            databaseBody.innerHTML = "<tr><td colspan='6'>No trips found in database</td></tr>";
            return;
        }
        
        trips.forEach(trip => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${trip.date || ""}</td>
                <td>${trip.driver || ""}</td>
                <td>${trip.vehicle || ""}</td>
                <td>${trip.miles || 0}</td>
                <td>${trip.wait || 0}</td>
                <td>${trip.clockIn || ""} - ${trip.clockOut || ""}</td>
            `;
            databaseBody.appendChild(row);
        });
    } catch (err) {
        console.error("Database error:", err);
        databaseBody.innerHTML = "<tr><td colspan='6'>Error loading database: Check console</td></tr>";
    }
}

function loadSpreadsheetView() {
    const container = document.getElementById("spreadsheetContainer");
    if (!container) return;
    
    container.innerHTML = `
        <h3>Google Sheets Integration</h3>
        <p>Your trip data is automatically synced to Google Sheets.</p>
        <div class="spreadsheet-actions">
            <a href="https://docs.google.com/spreadsheets/d/1Gnu7tG-56xRiy7qA7BODgh3b9glJw3HhkXwTYzUCM-E/edit" target="_blank" class="sheet-link">
                Open Full Spreadsheet
            </a>
            <button onclick="refreshSpreadsheetView()" class="refresh-btn">
                Refresh Data
            </button>
        </div>
        <div class="data-summary">
            <p>Note: Data is automatically synced when you submit trips.</p>
            <p>Managers can edit and analyze data directly in the spreadsheet.</p>
        </div>
    `;
}

function refreshSpreadsheetView() {
    if (confirm("Data syncs automatically when trips are submitted. Open the Google Sheet to see latest data?")) {
        window.open('https://docs.google.com/spreadsheets/d/1Gnu7tG-56xRiy7qA7BODgh3b9glJw3HhkXwTYzUCM-E/edit', '_blank');
    }
}
