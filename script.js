// ======================================================
// === SIMPLE AUTH MODEL ================================
// ======================================================

const users = [
    { id: "driver1", password: "1234", role: "driver" },
    { id: "Mike Mike", password: "2024", role: "driver" },
    { id: "Big B", password: "8183", role: "driver" },
    { id: "manager1", password: "5678", role: "manager" },
    { id: "B Mgr", password: "0516", role: "manager" }
];

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

// Trip sheet elements
const tripForm = document.getElementById("tripForm");
const addStopRowBtn = document.getElementById("addStopRow");
const removeStopRowBtn = document.getElementById("removeStopRow");
const stopsTableBody = document.querySelector("#stopsTable tbody");
const totalMilesSpan = document.getElementById("totalMiles");
const totalWaitSpan = document.getElementById("totalWait");
const tripMessage = document.getElementById("tripMessage");

// Driver dashboard elements
const driverStartDateInput = document.getElementById("driverStartDate");
const driverEndDateInput = document.getElementById("driverEndDate");
const loadDriverTripsBtn = document.getElementById("loadDriverTrips");
const driverTripsBody = document.getElementById("driverTripsBody");
const driverTotalTripsSpan = document.getElementById("driverTotalTrips");
const driverTotalHoursSpan = document.getElementById("driverTotalHours");

// ======================================================
// === LOGIN LOGIC ======================================
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

    // AUTO-POPULATE DRIVER NAME
    const driverNameInput = document.getElementById("driverName");
    if (driverNameInput) {
        driverNameInput.value = currentUser.id;
        driverNameInput.readOnly = true; // Make it read-only so they can't change it
    }

    applyRoleUI();
    showView("dashboard");
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
}

// ======================================================
// === DARK MODE ========================================
// ======================================================

darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// ======================================================
// === STOP SYSTEM ======================================
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
// === GOOGLE SHEETS WEB APP URL ========================
// ======================================================

const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyIgVGSZWj8rWVNllk5ADQ7QOwiZQzdPHMyu3zJ7OvnfE7kjWulGKy_RgK2CUApyhfx/exec";

// ======================================================
// === TRIP SUBMIT ======================================
// ======================================================

tripForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
        tripMessage.textContent = "You must be logged in.";
        tripMessage.style.color = "red";
        return;
    }

    // Mapping exact HTML IDs
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
        tripMessage.textContent = "Please fill in Driver Name, Trip Date, and Van ID.";
        tripMessage.style.color = "red";
        return;
    }

    tripMessage.textContent = "Submitting trip...";
    tripMessage.style.color = "yellow";

    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "appendTrip", trip })
        });

        tripMessage.textContent = "Trip submitted successfully.";
        tripMessage.style.color = "lime";
        
        tripForm.reset();
        // Re-populate driver name after reset
        document.getElementById("driverName").value = currentUser.id;
        totalMilesSpan.textContent = "0";
        totalWaitSpan.textContent = "0";
        // Resetting stop table to 1 row
        while (stopsTableBody.children.length > 1) {
            stopsTableBody.removeChild(stopsTableBody.lastElementChild);
        }
    } catch (err) {
        console.error(err);
        tripMessage.textContent = "Error submitting trip. Check connection.";
        tripMessage.style.color = "red";
    }
});

// ======================================================
// === DRIVER DASHBOARD =================================
// ======================================================

loadDriverTripsBtn.addEventListener("click", async () => {
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                mode: "fetchDriverTrips", 
                driverId: currentUser.id, 
                startDate, 
                endDate 
            })
        });

        const result = await response.json();
        console.log("Dashboard response:", result); // For debugging
        
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
        driverTripsBody.innerHTML = "<tr><td colspan='5'>Error loading history. Check console for details.</td></tr>";
    }
});

function estimateHours(dateStr, startTime, endTime) {
    try {
        const start = new Date(`${dateStr}T${startTime}`);
        const end = new Date(`${dateStr}T${endTime}`);
        const diffMs = end - start;
        return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    } catch { return 0; }
}
