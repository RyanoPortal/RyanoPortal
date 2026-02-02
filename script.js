// --- Simple auth model for now ---
const users = [
    { id: "driver1", password: "1234", role: "driver" },
    { id: "manager1", password: "5678", role: "manager" }
];

let currentUser = null;

// --- DOM references ---
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

// --- Login logic ---
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
});

// --- Role-based UI ---
function applyRoleUI() {
    if (!currentUser) return;

    const isDriver = currentUser.role === "driver";

    const dbBtn = document.querySelector('[data-view="database"]');
    const sheetBtn = document.querySelector('[data-view="spreadsheet"]');

    if (isDriver) {
        // Hide manager-only views
        if (dbBtn) dbBtn.style.display = "none";
        if (sheetBtn) sheetBtn.style.display = "none";
    } else {
        if (dbBtn) dbBtn.style.display = "block";
        if (sheetBtn) sheetBtn.style.display = "block";
    }
}

// --- Navigation ---
navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        if (!view) return;

        // Prevent drivers from manually navigating to manager views
        if (currentUser && currentUser.role === "driver") {
            if (view === "database" || view === "spreadsheet") {
                return;
            }
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

// --- Dark mode ---
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// --- Trip sheet: add/remove stops ---
addStopRowBtn.addEventListener("click", () => {
    const lastRow = stopsTableBody.lastElementChild;
    const newRow = lastRow.cloneNode(true);

    const newIndex = stopsTableBody.children.length + 1;
    newRow.querySelector(".stop-number").textContent = newIndex;

    newRow.querySelectorAll("input").forEach(input => {
        input.value = input.type === "number" ? "0" : "";
    });

    stopsTableBody.appendChild(newRow);
});

removeStopRowBtn.addEventListener("click", () => {
    if (stopsTableBody.children.length > 1) {
        stopsTableBody.removeChild(stopsTableBody.lastElementChild);
    }
    updateTotals();
});

// --- Trip sheet: totals ---
function updateTotals() {
    // Total wait
    let totalWait = 0;
    document.querySelectorAll(".stop-wait").forEach(input => {
        const val = parseFloat(input.value) || 0;
        totalWait += val;
    });
    totalWaitSpan.textContent = totalWait.toString();

    // Total miles
    const startOdometer = parseFloat(document.getElementById("startOdometer").value) || 0;
    const endOdometer = parseFloat(document.getElementById("endOdometer").value) || 0;
    const miles = endOdometer - startOdometer;
    totalMilesSpan.textContent = miles > 0 ? miles.toString() : "0";
}

document.getElementById("startOdometer").addEventListener("input", updateTotals);
document.getElementById("endOdometer").addEventListener("input", updateTotals);
stopsTableBody.addEventListener("input", e => {
    if (e.target.classList.contains("stop-wait")) {
        updateTotals();
    }
});

// --- Trip sheet: submit ---
tripForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) {
        tripMessage.textContent = "You must be logged in.";
        return;
    }

    const driverName = document.getElementById("driverName").value.trim();
    const vehicleNumber = document.getElementById("vehicleNumber").value.trim();
    const startOdometer = parseFloat(document.getElementById("startOdometer").value) || 0;
    const crewNames = document.getElementById("crewNames").value.trim();
    const endOdometer = parseFloat(document.getElementById("endOdometer").value) || 0;
    const tripDate = document.getElementById("tripDate").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    if (!driverName || !vehicleNumber || !tripDate || !startTime || !endTime) {
        tripMessage.textContent = "Please fill in all required fields.";
        return;
    }

    const stops = [];
    document.querySelectorAll("#stopsTable tbody tr").forEach(row => {
        const location = row.querySelector(".stop-location").value.trim();
        const timeIn = row.querySelector(".stop-in").value;
        const timeOut = row.querySelector(".stop-out").value;
        const wait = parseFloat(row.querySelector(".stop-wait").value) || 0;

        if (location || timeIn || timeOut || wait > 0) {
            stops.push({ location, timeIn, timeOut, wait });
        }
    });

    const totalWait = parseFloat(totalWaitSpan.textContent) || 0;
    const totalMiles = parseFloat(totalMilesSpan.textContent) || 0;

    const trip = {
        driverId: currentUser.id,
        role: currentUser.role,
        driverName,
        vehicleNumber,
        crewNames,
        startOdometer,
        endOdometer,
        tripDate,
        startTime,
        endTime,
        totalWait,
        totalMiles,
        stops,
        submittedAt: new Date().toISOString()
    };

    tripMessage.textContent = "Submitting trip...";
    try {
        const ok = await appendTripToSheet(trip);
        if (ok) {
            tripMessage.textContent = "Trip submitted successfully.";
            tripForm.reset();
            totalMilesSpan.textContent = "0";
            totalWaitSpan.textContent = "0";
        } else {
            tripMessage.textContent = "Trip submission failed.";
        }
    } catch (err) {
        tripMessage.textContent = "Error submitting trip.";
    }
});

// --- Driver dashboard: load own trips ---
loadDriverTripsBtn.addEventListener("click", async () => {
    if (!currentUser || currentUser.role !== "driver") return;

    const startDate = driverStartDateInput.value;
    const endDate = driverEndDateInput.value;

    driverTripsBody.innerHTML = "";
    driverTotalTripsSpan.textContent = "0";
    driverTotalHoursSpan.textContent = "0";

    if (!startDate || !endDate) {
        return;
    }

    const trips = await fetchTripsForDriver(currentUser.id, startDate, endDate);
    if (!Array.isArray(trips)) return;

    let totalTrips = 0;
    let totalHours = 0;

    trips.forEach(trip => {
        totalTrips++;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${trip.tripDate || ""}</td>
            <td>${trip.startTime || ""}</td>
            <td>${trip.endTime || ""}</td>
            <td>${trip.totalMiles || 0}</td>
            <td>${trip.totalWait || 0}</td>
        `;
        driverTripsBody.appendChild(row);

        // Rough hours calc if backend returns start/end times
        if (trip.startTime && trip.endTime) {
            const h = estimateHours(trip.tripDate, trip.startTime, trip.endTime);
            totalHours += h;
        }
    });

    driverTotalTripsSpan.textContent = totalTrips.toString();
    driverTotalHoursSpan.textContent = totalHours.toFixed(2);
});

// Rough hours estimate from date + times
function estimateHours(dateStr, startTime, endTime) {
    try {
        const start = new Date(`${dateStr}T${startTime}`);
        const end = new Date(`${dateStr}T${endTime}`);
        const diffMs = end - start;
        if (diffMs <= 0) return 0;
        return diffMs / (1000 * 60 * 60);
    } catch {
        return 0;
    }
                              }
