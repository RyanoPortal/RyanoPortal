// ======================================================
// === CONFIGURATION ====================================
// ======================================================

const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbytDZ27z_nUNRUYgF2dM7xJ9iRR6Cw-RG5Ykvot1hhyRpKgY4suJuhw4Lq4HKm39mXC/exec";

const users = [
    { id: "driver1", password: "1234", role: "driver" },
    { id: "Mike Mike", password: "2024", role: "driver" },
    { id: "Big B", password: "8183", role: "driver" },
    { id: "manager1", password: "5678", role: "manager" },
    { id: "B Mgr", password: "0516", role: "manager" }
];

// ======================================================
// === STATE ============================================
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
const userIdLabel = document.getElementById("userIdLabel");

const driverNameInput = document.getElementById("driverName");
const tripDateInput = document.getElementById("tripDate");
const vanIdInput = document.getElementById("vanId");
const tripTypeInput = document.getElementById("tripType");
const startOdometerInput = document.getElementById("startOdometer");
const rrNumberInput = document.getElementById("rrNumber");
const hallconNumberInput = document.getElementById("hallconNumber");
const dispatcherNumberInput = document.getElementById("dispatcherNumber");
const crewNamesInput = document.getElementById("crewNames");
const destinationInput = document.getElementById("destination");

const EOTTIME = document.getElementById("EOTTIME");
const EOTODO = document.getElementById("EOTODO");
const TOTALWAIT = document.getElementById("TOTALWAIT");
const TOTALMILES = document.getElementById("TOTALMILES");

const stopsTableBody = document.getElementById("stopsBody");

const addStopRowBtn = document.getElementById("addStopRow");
const removeStopRowBtn = document.getElementById("removeStopRow");
const submitTripBtn = document.getElementById("submitTrip");

// ======================================================
// === INITIALIZATION ===================================
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    // Auto-fill today's date
    const today = new Date();
    tripDateInput.value = today.toISOString().split("T")[0];

    // Restore logged-in user
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        driverNameInput.value = currentUser.id;
    }

    setupRemoveButtons();
    updateTotals();
});

// ======================================================
// === LOGIN ============================================
// ======================================================

if (loginButton) {
    loginButton.addEventListener("click", () => {
        const id = employeeIdInput.value.trim();
        const pw = passwordInput.value.trim();

        const user = users.find(u => u.id === id && u.password === pw);
        if (!user) {
            loginError.textContent = "Invalid ID or password.";
            return;
        }

        currentUser = { id: user.id, role: user.role };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        driverNameInput.value = currentUser.id;
        loginOverlay.style.display = "none";
    });
}

if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem("currentUser");
        location.reload();
    });
}

// ======================================================
// === STOP ROW MANAGEMENT ===============================
// ======================================================

function setupRemoveButtons() {
    document.querySelectorAll(".remove-stop-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            if (stopsTableBody.children.length > 1) {
                this.closest("tr").remove();
                renumberStops();
                updateTotals();
            }
        });
    });
}

function renumberStops() {
    [...stopsTableBody.children].forEach((row, i) => {
        row.querySelector(".stop-number").textContent = i + 1;
    });
}

addStopRowBtn.addEventListener("click", () => {
    const row = document.createElement("tr");
    const num = stopsTableBody.children.length + 1;

    row.innerHTML = `
        <td class="stop-number">${num}</td>
        <td><input type="text" class="stop-times" placeholder="HHMM-HHMM"></td>
        <td><input type="text" class="stop-location"></td>
        <td><input type="text" class="stop-odometer"></td>
        <td><input type="text" class="stop-why" maxlength="4"></td>
        <td><input type="number" class="stop-wait" value="0"></td>
        <td><button type="button" class="remove-stop-btn">Remove</button></td>
    `;

    stopsTableBody.appendChild(row);

    row.querySelector(".remove-stop-btn").addEventListener("click", () => {
        if (stopsTableBody.children.length > 1) {
            row.remove();
            renumberStops();
            updateTotals();
        }
    });

    row.querySelector(".stop-wait").addEventListener("input", updateTotals);
});

removeStopRowBtn.addEventListener("click", () => {
    if (stopsTableBody.children.length > 1) {
        stopsTableBody.lastElementChild.remove();
        renumberStops();
        updateTotals();
    }
});

// ======================================================
// === TOTALS ===========================================
// ======================================================

function updateTotals() {
    // Total Wait
    let totalWait = 0;
    document.querySelectorAll(".stop-wait").forEach(input => {
        totalWait += parseFloat(input.value) || 0;
    });
    TOTALWAIT.value = totalWait;

    // Total Miles
    const start = parseFloat(startOdometerInput.value) || 0;
    const end = parseFloat(EOTODO.value) || 0;
    const miles = end - start;
    TOTALMILES.value = miles > 0 ? miles : 0;
}

startOdometerInput.addEventListener("input", updateTotals);
EOTODO.addEventListener("input", updateTotals);
stopsTableBody.addEventListener("input", e => {
    if (e.target.classList.contains("stop-wait")) updateTotals();
});

// ======================================================
// === COLLECT STOPS ====================================
// ======================================================

function collectStops() {
    const stops = [];
    [...stopsTableBody.children].forEach((row, i) => {
        stops.push({
            index: i + 1,
            times: row.querySelector(".stop-times").value.trim(),
            location: row.querySelector(".stop-location").value.trim(),
            odometer: row.querySelector(".stop-odometer").value.trim(),
            why: row.querySelector(".stop-why").value.trim(),
            wait: parseFloat(row.querySelector(".stop-wait").value) || 0
        });
    });
    return stops;
}

// ======================================================
// === SUBMIT TRIP ======================================
// ======================================================

submitTripBtn.addEventListener("click", async () => {
    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    const trip = {
        driverName: driverNameInput.value.trim(),
        tripdate: tripDateInput.value.trim(),       // KEEP OLD BACKEND NAME
        vanID: vanIdInput.value.trim(),             // KEEP OLD BACKEND NAME
        tripType: tripTypeInput.value.trim(),
        startOdometer: startOdometerInput.value.trim(),
        rrNumber: rrNumberInput.value.trim(),
        hallconNumber: hallconNumberInput.value.trim(),
        dispatcher: dispatcherNumberInput.value.trim(), // KEEP OLD BACKEND NAME
        crewNames: crewNamesInput.value.trim(),
        destination: destinationInput.value.trim(),
        stops: collectStops(),
        dropcrewOdometer: EOTODO.value.trim(),      // KEEP OLD BACKEND NAME
        dropcrewTime: EOTTIME.value.trim(),         // KEEP OLD BACKEND NAME
        totalMiles: TOTALMILES.value.trim(),
        totalWait: TOTALWAIT.value.trim(),
        submittedAt: new Date().toISOString()
    };

    if (!trip.driverName || !trip.tripdate || !trip.vanID) {
        alert("Driver Name, Trip Date, and Van ID are required.");
        return;
    }

    try {
        await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "appendTrip", trip })
        });

        alert("Trip submitted successfully!");

    } catch (err) {
        console.error(err);
        alert("Error submitting trip.");
    }
});
