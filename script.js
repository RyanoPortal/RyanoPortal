// ======================================================
// === CONFIGURATION ====================================
// ======================================================

const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyIgVGSZWj8rWVNllk5ADQ7QOwiZQzdPHMyu3zJ7OvnfE7kjWulGKy_RgK2CUApyhfx/exec";

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
const userIdLabel = document.getElementById("userIdLabel");
const darkModeToggle = document.getElementById("darkModeToggle");
const tripForm = document.getElementById("tripForm");
const addStopRowBtn = document.getElementById("addStopRow");
const removeStopRowBtn = document.getElementById("removeStopRow");
const stopsTableBody = document.querySelector("#stopsTable tbody");
const totalMilesSpan = document.getElementById("totalMiles");
const totalWaitSpan = document.getElementById("totalWait");
const tripMessage = document.getElementById("tripMessage");
const clearFormBtn = document.getElementById("clearFormBtn");

// ======================================================
// === INITIALIZATION ===================================
// ======================================================

document.addEventListener('DOMContentLoaded', function() {
    // Set today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const tripDateInput = document.getElementById("tripdate");
    if (tripDateInput) {
        tripDateInput.value = `${year}-${month}-${day}`;
    }
    
    // Check for saved user
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            loginOverlay.style.display = "none";
            userIdLabel.textContent = `${currentUser.id}`;
            
            const driverNameInput = document.getElementById("driverName");
            if (driverNameInput) {
                driverNameInput.value = currentUser.id;
            }
        } catch {
            localStorage.removeItem('currentUser');
        }
    }
    
    // Check for dark mode
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Setup remove buttons
    setupRemoveButtons();
});

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

    userIdLabel.textContent = `${currentUser.id}`;

    const driverNameInput = document.getElementById("driverName");
    if (driverNameInput) {
        driverNameInput.value = currentUser.id;
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
});

logoutButton.addEventListener("click", () => {
    currentUser = null;
    loginOverlay.style.display = "flex";
    employeeIdInput.value = "";
    passwordInput.value = "";
    userIdLabel.textContent = "";

    const driverNameInput = document.getElementById("driverName");
    if (driverNameInput) {
        driverNameInput.value = "";
    }

    localStorage.removeItem('currentUser');
    
    // Clear form
    tripForm.reset();
    setTodayDate();
    totalMilesSpan.textContent = "0";
    totalWaitSpan.textContent = "0";
});

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

function setupRemoveButtons() {
    document.querySelectorAll('.remove-stop-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            if (stopsTableBody.children.length > 1) {
                row.remove();
                renumberStops();
                updateTotals();
            }
        });
    });
}

function renumberStops() {
    const rows = stopsTableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        row.querySelector('.stop-number').textContent = index + 1;
    });
}

addStopRowBtn.addEventListener("click", () => {
    const newRow = document.createElement('tr');
    const rowCount = stopsTableBody.children.length + 1;
    
    newRow.innerHTML = `
        <td style="text-align: center; font-weight: bold;" class="stop-number">${rowCount}</td>
        <td><input type="text" class="stop-times" placeholder="HHMM-HHMM" style="text-align: center;"></td>
        <td><input type="text" class="stop-location" placeholder="Street address / cross streets" style="width: 100%;"></td>
        <td><input type="text" class="stop-odometer" placeholder="00000" style="text-align: center;"></td>
        <td><input type="text" class="stop-why" maxlength="4" placeholder="Code" style="text-align: center;"></td>
        <td><input type="number" class="stop-wait" value="0" style="text-align: center; width: 80px;"></td>
        <td style="text-align: center;">
            <button type="button" class="remove-stop-btn" style="background: #dc3545; padding: 5px 10px;">✖</button>
        </td>
    `;
    
    stopsTableBody.appendChild(newRow);
    
    // Add remove listener to new button
    newRow.querySelector('.remove-stop-btn').addEventListener('click', function() {
        if (stopsTableBody.children.length > 1) {
            this.closest('tr').remove();
            renumberStops();
            updateTotals();
        }
    });
});

removeStopRowBtn.addEventListener("click", () => {
    if (stopsTableBody.children.length > 1) {
        stopsTableBody.removeChild(stopsTableBody.lastElementChild);
        renumberStops();
        updateTotals();
    }
});

function updateTotals() {
    let totalWait = 0;
    document.querySelectorAll(".stop-wait").forEach(input => {
        totalWait += parseFloat(input.value) || 0;
    });
    totalWaitSpan.textContent = totalWait;

    const startOdometer = parseFloat(document.getElementById("startOdometer").value) || 0;
    const dropcrewOdometer = parseFloat(document.getElementById("dropcrewOdometer").value) || 0;
    const miles = dropcrewOdometer - startOdometer;
    totalMilesSpan.textContent = miles > 0 ? miles : 0;
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
        stops.push({ index: index + 1, times, location, odometer, why, wait });
    });
    return stops;
}

// ======================================================
// === TRIP SUBMISSION ==================================
// ======================================================

tripForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showTripMessage("Please login first.", "error");
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
        showTripMessage("Driver Name, Trip Date, and Van ID are required.", "error");
        return;
    }

    showTripMessage("Submitting trip...", "loading");

    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "appendTrip", trip })
        });

        showTripMessage("✓ Trip submitted successfully!", "success");
        
        // Save for preview
        saveTripForPreview(trip);
        
        // Reset form but keep driver name
        const driverName = document.getElementById("driverName").value;
        tripForm.reset();
        document.getElementById("driverName").value = driverName;
        
        // Reset date to today
        setTodayDate();
        
        totalMilesSpan.textContent = "0";
        totalWaitSpan.textContent = "0";
        
        // Reset stops to one row
        while (stopsTableBody.children.length > 1) {
            stopsTableBody.removeChild(stopsTableBody.lastElementChild);
        }
        
        // Clear first stop row
        const firstRow = stopsTableBody.firstElementChild;
        firstRow.querySelector('.stop-times').value = '';
        firstRow.querySelector('.stop-location').value = '';
        firstRow.querySelector('.stop-odometer').value = '';
        firstRow.querySelector('.stop-why').value = '';
        firstRow.querySelector('.stop-wait').value = '0';
        firstRow.querySelector('.stop-number').textContent = '1';
        
    } catch (err) {
        console.error(err);
        showTripMessage("❌ Error submitting trip. Check connection.", "error");
    }
});

function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById("tripdate").value = `${year}-${month}-${day}`;
}

function showTripMessage(message, type) {
    tripMessage.textContent = message;
    switch(type) {
        case "error": tripMessage.style.color = "#dc3545"; break;
        case "success": tripMessage.style.color = "#28a745"; break;
        case "loading": tripMessage.style.color = "#ffc107"; break;
    }
}

// ======================================================
// === CLEAR FORM =======================================
// ======================================================

clearFormBtn.addEventListener("click", () => {
    if (confirm("Clear all form data?")) {
        const driverName = document.getElementById("driverName").value;
        tripForm.reset();
        document.getElementById("driverName").value = driverName;
        setTodayDate();
        totalMilesSpan.textContent = "0";
        totalWaitSpan.textContent = "0";
        
        // Reset stops to one empty row
        while (stopsTableBody.children.length > 1) {
            stopsTableBody.removeChild(stopsTableBody.lastElementChild);
        }
        const firstRow = stopsTableBody.firstElementChild;
        firstRow.querySelector('.stop-times').value = '';
        firstRow.querySelector('.stop-location').value = '';
        firstRow.querySelector('.stop-odometer').value = '';
        firstRow.querySelector('.stop-why').value = '';
        firstRow.querySelector('.stop-wait').value = '0';
    }
});

// ======================================================
// === PRINT PREVIEW ====================================
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
        clockOut: trip.clockOut,
        startOdometer: trip.startOdometer
    };
    
    localStorage.setItem('lastTrip', JSON.stringify(previewTrip));
}

document.getElementById('previewTrip').addEventListener('click', openTripPreview);

function openTripPreview() {
    if (!currentUser) {
        alert("Please login first.");
        return;
    }

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
        clockOut: document.getElementById("clockOut").value.trim(),
        startOdometer: document.getElementById("startOdometer").value.trim()
    };
    
    if (!trip.driverName || !trip.tripDate || !trip.vanId) {
        alert("Please fill in Driver Name, Trip Date, and Van ID.");
        return;
    }
    
    saveTripForPreview(trip);
    window.open('trip-sheet-preview.html', '_blank', 'width=1000,height=800');
}

// ======================================================
// === PRINT GUIDE ======================================
// ======================================================

function showPrintGuide() {
    document.getElementById('printGuideModal').style.display = 'flex';
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('printGuideModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
