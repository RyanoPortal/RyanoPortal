// URL of your deployed Apps Script Web App (no credentials here)
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwlmH1fjP5Iyjr2kZedrDYGZ6ySaJqEFWdlCsq-Etf2YRWuWBZUfxFIrrofHn_eJQWH/exec";

// Append a trip to Google Sheets
async function appendTripToSheet(tripData) {
    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "appendTrip",
                trip: tripData
            })
        });

        if (!response.ok) return false;
        const result = await response.json().catch(() => ({}));
        return result.success === true || result.status === "ok";
    } catch (err) {
        return false;
    }
}

// Fetch trips for a specific driver between two dates
async function fetchTripsForDriver(driverId, startDate, endDate) {
    try {
        const response = await fetch(SHEETS_WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "fetchDriverTrips",
                driverId,
                startDate,
                endDate
            })
        });

        if (!response.ok) return [];
        const result = await response.json().catch(() => ({}));
        if (!Array.isArray(result.trips)) return [];
        return result.trips;
    } catch (err) {
        return [];
    }
}
