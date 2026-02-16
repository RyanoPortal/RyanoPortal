const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbytDZ27z_nUNRUYgF2dM7xJ9iRR6Cw-RG5Ykvot1hhyRpKgY4suJuhw4Lq4HKm39mXC/exec";

const users = [
    { id: "driver1", password: "1234", role: "driver" },
    { id: "Mike Mike", password: "2024", role: "driver" },
    { id: "Big B", password: "8183", role: "driver" },
    { id: "manager1", password: "5678", role: "manager" },
    { id: "B Mgr", password: "0516", role: "manager" }
];

let currentUser = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Check Login
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById("driverName").value = currentUser.id;
        document.getElementById("login-overlay").style.display = "none";
    }

    // Default Date
    document.getElementById("tripDate").value = new Date().toISOString().split("T")[0];

    // Theme logic
    if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
    
    setupEventListeners();
    updateTotals();
});

function setupEventListeners() {
    // Theme Toggle
    document.getElementById("darkModeToggle").addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    });

    // Login
    document.getElementById("loginButton").addEventListener("click", () => {
        const id = document.getElementById("employeeId").value;
        const pw = document.getElementById("password").value;
        const user = users.find(u => u.id === id && u.password === pw);
        if (user) {
            currentUser = user;
            localStorage.setItem("currentUser", JSON.stringify(user));
            location.reload();
        } else {
            document.getElementById("loginError").textContent = "Invalid Credentials";
        }
    });

    // Logout
    document.getElementById("logoutButton").addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        location.reload();
    });

    // Add Row
    document.getElementById("addStopRow").addEventListener("click", addStopRow);

    // Calc triggers
    document.getElementById("startOdometer").addEventListener("input", updateTotals);
    document.getElementById("EOTODO").addEventListener("input", updateTotals);
    
    // Initial row(s) calc - attach listeners to all existing rows
    document.querySelectorAll("#stopsBody tr").forEach(row => {
        attachRowListeners(row);
    });
}

function addStopRow() {
    const tbody = document.getElementById("stopsBody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td class="stop-number">${tbody.children.length + 1}</td>
        <td><input type="text" class="stop-times"></td>
        <td><input type="text" class="stop-location"></td>
        <td><input type="number" class="stop-odometer"></td>
        <td><input type="text" class="stop-why" maxlength="4"></td>
        <td><input type="number" class="stop-wait" value="0"></td>
        <td><button type="button" class="remove-stop-btn">X</button></td>
    `;
    tbody.appendChild(row);
    attachRowListeners(row);
}

function attachRowListeners(row) {
    const waitInput = row.querySelector(".stop-wait");
    const removeBtn = row.querySelector(".remove-stop-btn");
    
    if (waitInput) {
        waitInput.addEventListener("input", updateTotals);
    }
    
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            row.remove();
            renumberStops();
            updateTotals();
        });
    }
}

function renumberStops() {
    document.querySelectorAll(".stop-number").forEach((td, i) => td.textContent = i + 1);
}

function updateTotals() {
    // Sum Wait Times
    let totalWait = 0;
    document.querySelectorAll(".stop-wait").forEach(input => {
        totalWait += parseFloat(input.value) || 0;
    });
    document.getElementById("TOTALWAIT").value = totalWait;

    // Calc Miles
    const start = parseFloat(document.getElementById("startOdometer").value) || 0;
    const end = parseFloat(document.getElementById("EOTODO").value) || 0;
    const diff = end - start;
    document.getElementById("TOTALMILES").value = diff > 0 ? diff : 0;
}

// Submit to Google
document.getElementById("submitTrip").addEventListener("click", async () => {
    if (!currentUser) return alert("Login first");
    
    const stops = [];
    document.querySelectorAll("#stopsBody tr").forEach((row, i) => {
        stops.push({
            index: i + 1,
            times: row.querySelector(".stop-times").value,
            location: row.querySelector(".stop-location").value,
            odometer: row.querySelector(".stop-odometer").value,
            why: row.querySelector(".stop-why").value,
            wait: row.querySelector(".stop-wait").value
        });
    });

    const trip = {
        driverName: document.getElementById("driverName").value,
        tripdate: document.getElementById("tripDate").value,
        vanID: document.getElementById("vanId").value,
        tripType: document.getElementById("tripType").value,
        startOdometer: document.getElementById("startOdometer").value,
        rrNumber: document.getElementById("rrNumber").value,
        hallconNumber: document.getElementById("hallconNumber").value,
        dispatcher: document.getElementById("dispatcherNumber").value,
        crewNames: document.getElementById("crewNames").value,
        destination: document.getElementById("destination").value,
        stops: stops,
        notes: document.getElementById("notes").value,
        dropcrewOdometer: document.getElementById("EOTODO").value,
        dropcrewTime: document.getElementById("EOTTIME").value,
        totalMiles: document.getElementById("TOTALMILES").value,
        totalWait: document.getElementById("TOTALWAIT").value,
        clockInTime: document.getElementById("clockInTime").value,
        clockOutTime: document.getElementById("clockOutTime").value
    };

    // Save to localStorage for preview
    localStorage.setItem('lastTrip', JSON.stringify(trip));

    try {
        await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ mode: "appendTrip", trip })
        });
        alert("Submitted Successfully!");
        
        // Clear the form after successful submission
        clearForm();
    } catch (e) {
        alert("Error submitting. Check connection.");
    }
});

// Clear form function
function clearForm() {
    // Clear all text inputs except driver name and date
    document.getElementById("vanId").value = "";
    document.getElementById("tripType").value = "";
    document.getElementById("startOdometer").value = "";
    document.getElementById("rrNumber").value = "";
    document.getElementById("hallconNumber").value = "";
    document.getElementById("dispatcherNumber").value = "";
    document.getElementById("crewNames").value = "";
    document.getElementById("destination").value = "";
    document.getElementById("notes").value = "";
    document.getElementById("EOTODO").value = "";
    document.getElementById("EOTTIME").value = "";
    document.getElementById("TOTALWAIT").value = "0";
    document.getElementById("TOTALMILES").value = "0";
    document.getElementById("clockInTime").value = "";
    document.getElementById("clockOutTime").value = "";
    
    // Clear all stops except the first one
    const stopsBody = document.getElementById("stopsBody");
    while (stopsBody.children.length > 1) {
        stopsBody.removeChild(stopsBody.lastChild);
    }
    
    // Clear the first stop row
    const firstRow = stopsBody.children[0];
    firstRow.querySelector(".stop-times").value = "";
    firstRow.querySelector(".stop-location").value = "";
    firstRow.querySelector(".stop-odometer").value = "";
    firstRow.querySelector(".stop-why").value = "";
    firstRow.querySelector(".stop-wait").value = "0";
    
    // Reset date to today
    document.getElementById("tripDate").value = new Date().toISOString().split("T")[0];
}

// Preview button functionality
function openPreview() {
    const stops = [];
    document.querySelectorAll("#stopsBody tr").forEach((row, i) => {
        stops.push({
            index: i + 1,
            times: row.querySelector(".stop-times").value,
            location: row.querySelector(".stop-location").value,
            odometer: row.querySelector(".stop-odometer").value,
            why: row.querySelector(".stop-why").value,
            wait: row.querySelector(".stop-wait").value
        });
    });

    const trip = {
        driverName: document.getElementById("driverName").value,
        tripdate: document.getElementById("tripDate").value,
        vanID: document.getElementById("vanId").value,
        tripType: document.getElementById("tripType").value,
        startOdometer: document.getElementById("startOdometer").value,
        rrNumber: document.getElementById("rrNumber").value,
        hallconNumber: document.getElementById("hallconNumber").value,
        dispatcher: document.getElementById("dispatcherNumber").value,
        crewNames: document.getElementById("crewNames").value,
        destination: document.getElementById("destination").value,
        stops: stops,
        notes: document.getElementById("notes").value,
        dropcrewOdometer: document.getElementById("EOTODO").value,
        dropcrewTime: document.getElementById("EOTTIME").value,
        totalMiles: document.getElementById("TOTALMILES").value,
        totalWait: document.getElementById("TOTALWAIT").value,
        clockInTime: document.getElementById("clockInTime").value,
        clockOutTime: document.getElementById("clockOutTime").value
    };

    // Save to localStorage
    localStorage.setItem('lastTrip', JSON.stringify(trip));
    
    // Open preview in new window
    window.open('trip-sheet-preview.html', '_blank', 'width=1200,height=800');
}