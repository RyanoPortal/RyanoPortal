// Application State
const state = {
    currentUser: null,
    users: [
        { id: "driver1", name: "John Driver", role: "driver", password: "driver123" },
        { id: "driver2", name: "Sarah Driver", role: "driver", password: "driver123" },
        { id: "manager1", name: "Jane Manager", role: "manager", password: "manager123" },
        { id: "admin1", name: "Admin User", role: "manager", password: "admin123" }
    ],
    trips: [],
    currentView: 'dashboard',
    darkMode: true,
    stops: [], // Current trip stops
    dbPage: 1,
    dbPageSize: 10,
    filteredTrips: []
};

// Mock data initialization
function initializeMockData() {
    // Add some sample trips for demonstration
    const sampleTrips = [
        {
            id: "TRP-" + Date.now(),
            driverName: "John Driver",
            date: new Date().toISOString().split('T')[0],
            vanId: "VAN-001",
            destination: "Downtown Medical Center",
            crewName: "Alpha Crew",
            dispatcher: "DISP-101",
            rrNumber: "RR-2024-001",
            hNumber: "H-45",
            startOdometer: 45200,
            stops: [
                { stopNumber: 1, time: "08:00", odometer: 45200, location: "Depot", reason: "Pickup", wait: 10 },
                { stopNumber: 2, time: "08:45", odometer: 45235, location: "Medical Center", reason: "Dropoff", wait: 20 }
            ],
            eotTime: "09:30",
            eotOdometer: 45280,
            totalWait: 30,
            totalMiles: 80,
            backTime: "10:00",
            submittedAt: new Date().toISOString(),
            submittedBy: "driver1"
        }
    ];
    
    if (state.trips.length === 0) {
        state.trips = sampleTrips;
    }
}

// Authentication Module
const auth = {
    login(employeeId, password) {
        const user = state.users.find(u => u.id === employeeId && u.password === password);
        if (user) {
            state.currentUser = user;
            localStorage.setItem('fleetflow_user', JSON.stringify(user));
            this.updateUI();
            return true;
        }
        return false;
    },
    
    logout() {
        state.currentUser = null;
        localStorage.removeItem('fleetflow_user');
        sheetsIntegration.signOut();
        location.reload();
    },
    
    checkSession() {
        const saved = localStorage.getItem('fleetflow_user');
        if (saved) {
            state.currentUser = JSON.parse(saved);
            this.updateUI();
            return true;
        }
        return false;
    },
    
    updateUI() {
        if (state.currentUser) {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appContainer').classList.remove('hidden');
            document.getElementById('userDisplayName').textContent = state.currentUser.name;
            
            // Show/hide manager-only elements
            const managerElements = document.querySelectorAll('.manager-only');
            if (state.currentUser.role === 'manager') {
                managerElements.forEach(el => el.classList.remove('hidden'));
            } else {
                managerElements.forEach(el => el.classList.add('hidden'));
            }
            
            // Pre-fill driver name if driver
            if (state.currentUser.role === 'driver') {
                document.getElementById('tsDriverName').value = state.currentUser.name;
            }
            
            app.refreshDashboard();
        }
    },

    toggleGoogleSignIn() {
        if (sheetsIntegration.isSignedIn) {
            sheetsIntegration.signOut();
        } else {
            sheetsIntegration.signIn();
        }
    }
};

// Trip Sheet Module
const tripSheet = {
    init() {
        // Set today's date
        document.getElementById('tsDate').valueAsDate = new Date();
        this.renderStops();
    },
    
    addStop() {
        const stopNumber = state.stops.length + 1;
        state.stops.push({
            stopNumber: stopNumber,
            time: '',
            odometer: '',
            location: '',
            reason: '',
            wait: 0
        });
        this.renderStops();
    },
    
    removeStop(index) {
        state.stops.splice(index, 1);
        // Renumber stops
        state.stops.forEach((stop, i) => stop.stopNumber = i + 1);
        this.renderStops();
        this.calculateTotals();
    },
    
    updateStop(index, field, value) {
        if (state.stops[index]) {
            state.stops[index][field] = value;
            if (field === 'wait') {
                this.calculateTotals();
            }
        }
    },
    
    renderStops() {
        const tbody = document.getElementById('stopsTableBody');
        tbody.innerHTML = '';
        
        state.stops.forEach((stop, index) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-700/50 last:border-0';
            row.innerHTML = `
                <td class="py-2 text-center font-medium text-slate-400">${stop.stopNumber}</td>
                <td class="py-2 px-2"><input type="time" value="${stop.time}" onchange="tripSheet.updateStop(${index}, 'time', this.value)" class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"></td>
                <td class="py-2 px-2"><input type="number" value="${stop.odometer}" onchange="tripSheet.updateStop(${index}, 'odometer', this.value)" class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"></td>
                <td class="py-2 px-2"><input type="text" value="${stop.location}" onchange="tripSheet.updateStop(${index}, 'location', this.value)" class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"></td>
                <td class="py-2 px-2"><input type="text" value="${stop.reason}" onchange="tripSheet.updateStop(${index}, 'reason', this.value)" class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"></td>
                <td class="py-2 px-2"><input type="number" value="${stop.wait}" onchange="tripSheet.updateStop(${index}, 'wait', parseInt(this.value)||0)" class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"></td>
                <td class="py-2 px-2 text-center">
                    <button type="button" onclick="tripSheet.removeStop(${index})" class="text-red-400 hover:text-red-300 p-1">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        feather.replace();
    },
    
    calculateTotals() {
        // Calculate total wait
        const totalWait = state.stops.reduce((sum, stop) => sum + (parseInt(stop.wait) || 0), 0);
        document.getElementById('tsTotalWait').value = totalWait;
        
        // Calculate total miles
        const startOdo = parseFloat(document.getElementById('tsStartOdo').value) || 0;
        const endOdo = parseFloat(document.getElementById('tsEotOdo').value) || 0;
        const totalMiles = endOdo - startOdo;
        document.getElementById('tsTotalMiles').value = totalMiles > 0 ? totalMiles : 0;
    },
    
    clearForm() {
        document.getElementById('tripSheetForm').reset();
        state.stops = [];
        this.renderStops();
        document.getElementById('tsDate').valueAsDate = new Date();
        if (state.currentUser?.role === 'driver') {
            document.getElementById('tsDriverName').value = state.currentUser.name;
        }
    },
    
    async submit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const tripId = "TRP-" + Date.now();
        
        const trip = {
            id: tripId,
            driverName: formData.get('driverName'),
            date: formData.get('date'),
            vanId: formData.get('vanId'),
            destination: formData.get('destination'),
            crewName: formData.get('crewName'),
            dispatcher: formData.get('dispatcher'),
            rrNumber: formData.get('rrNumber'),
            hNumber: formData.get('hNumber'),
            startOdometer: parseFloat(formData.get('startOdometer')) || 0,
            stops: [...state.stops],
            eotTime: formData.get('eotTime'),
            eotOdometer: parseFloat(formData.get('eotOdometer')) || 0,
            totalWait: parseInt(document.getElementById('tsTotalWait').value) || 0,
            totalMiles: parseFloat(document.getElementById('tsTotalMiles').value) || 0,
            backTime: formData.get('backTime'),
            submittedAt: new Date().toISOString(),
            submittedBy: state.currentUser.id
        };
        
        // Validation
        if (!trip.driverName || !trip.date || !trip.vanId) {
            app.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Save to local database
        state.trips.push(trip);
        
        // Try to save to Google Sheets if connected
        if (sheetsIntegration.isSignedIn) {
            try {
                await sheetsIntegration.appendTrip(trip);
                app.showToast('Trip saved to Google Sheets');
            } catch (error) {
                console.error('Failed to save to Google Sheets:', error);
                app.showToast('Saved locally. Google Sheets sync failed.', 'warning');
            }
        } else {
            app.showToast('Trip submitted successfully');
        }
        
        this.clearForm();
        app.refreshDashboard();
    }
};

// Database View Module
const databaseView = {
    currentPage: 1,
    pageSize: 10,
    
    load() {
        this.applyFilters();
    },
    
    applyFilters() {
        const fromDate = document.getElementById('dbFilterFrom').value;
        const toDate = document.getElementById('dbFilterTo').value;
        const driverQuery = document.getElementById('dbFilterDriver').value.toLowerCase();
        const vanQuery = document.getElementById('dbFilterVan').value.toLowerCase();
        
        state.filteredTrips = state.trips.filter(trip => {
            if (fromDate && trip.date < fromDate) return false;
            if (toDate && trip.date > toDate) return false;
            if (driverQuery && !trip.driverName.toLowerCase().includes(driverQuery)) return false;
            if (vanQuery && !trip.vanId.toLowerCase().includes(vanQuery)) return false;
            
            // Drivers can only see their own trips
            if (state.currentUser.role === 'driver' && trip.submittedBy !== state.currentUser.id) {
                return false;
            }
            
            return true;
        });
        
        this.currentPage = 1;
        this.render();
    },
    
    clearFilters() {
        document.getElementById('dbFilterFrom').value = '';
        document.getElementById('dbFilterTo').value = '';
        document.getElementById('dbFilterDriver').value = '';
        document.getElementById('dbFilterVan').value = '';
        this.applyFilters();
    },
    
    render() {
        const tbody = document.getElementById('databaseTableBody');
        tbody.innerHTML = '';
        
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = state.filteredTrips.slice(start, end);
        
        pageData.forEach(trip => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors';
            row.innerHTML = `
                <td class="py-3 px-2 font-mono text-xs">${trip.id}</td>
                <td class="py-3 px-2">${trip.date}</td>
                <td class="py-3 px-2">${trip.driverName}</td>
                <td class="py-3 px-2">${trip.vanId}</td>
                <td class="py-3 px-2">${trip.destination}</td>
                <td class="py-3 px-2 text-right">${trip.totalMiles}</td>
                <td class="py-3 px-2 text-right">${trip.totalWait}</td>
                <td class="py-3 px-2 text-center">${trip.stops.length}</td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('dbRecordCount').textContent = `${state.filteredTrips.length} records found`;
        document.getElementById('dbPageInfo').textContent = `Page ${this.currentPage} of ${Math.ceil(state.filteredTrips.length / this.pageSize) || 1}`;
        document.getElementById('dbPrevBtn').disabled = this.currentPage === 1;
        document.getElementById('dbNextBtn').disabled = end >= state.filteredTrips.length;
    },
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
        }
    },
    
    nextPage() {
        if (this.currentPage * this.pageSize < state.filteredTrips.length) {
            this.currentPage++;
            this.render();
        }
    },
    
    exportCSV() {
        const headers = ['Trip ID', 'Date', 'Driver', 'Van ID', 'Destination', 'Crew', 'Dispatcher', 'RR#', 'H#', 'Start Odo', 'EOT Odo', 'Total Miles', 'Total Wait', 'Back Time', 'Stops JSON'];
        const rows = state.filteredTrips.map(trip => [
            trip.id,
            trip.date,
            trip.driverName,
            trip.vanId,
            trip.destination,
            trip.crewName,
            trip.dispatcher,
            trip.rrNumber,
            trip.hNumber,
            trip.startOdometer,
            trip.eotOdometer,
            trip.totalMiles,
            trip.totalWait,
            trip.backTime,
            JSON.stringify(trip.stops)
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fleet-trips-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        app.showToast('CSV exported successfully');
    },
    
    exportToSpreadsheet() {
        spreadsheet.importFromDatabase(state.filteredTrips);
        app.navigate('spreadsheet');
        app.showToast('Data imported to spreadsheet');
    }
};

// Spreadsheet Module
const spreadsheet = {
    sheets: [],
    activeSheet: 0,
    gridRows: 50,
    gridCols: 26, // A-Z
    
    init() {
        this.addSheet('Sheet1');
        this.renderGrid();
    },
    
    addSheet(name = null) {
        const sheetName = name || `Sheet${this.sheets.length + 1}`;
        const sheet = {
            name: sheetName,
            data: {}, // Key: "A1", Value: {value: "", formula: ""}
            selectedCell: null
        };
        this.sheets.push(sheet);
        this.activeSheet = this.sheets.length - 1;
        this.renderTabs();
        this.renderGrid();
        return sheet;
    },
    
    switchSheet(index) {
        this.activeSheet = index;
        this.renderTabs();
        this.renderGrid();
    },
    
    renderTabs() {
        const container = document.getElementById('sheetTabs');
        container.innerHTML = '';
        
        this.sheets.forEach((sheet, index) => {
            const btn = document.createElement('button');
            btn.className = `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${index === this.activeSheet ? 'bg-slate-700 text-white border-t-2 border-blue-500' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`;
            btn.textContent = sheet.name;
            btn.onclick = () => this.switchSheet(index);
            container.appendChild(btn);
        });
    },
    
    getColName(index) {
        return String.fromCharCode(65 + index); // 0 = A, 1 = B, etc.
    },
    
    renderGrid() {
        const container = document.getElementById('spreadsheetGrid');
        const sheet = this.sheets[this.activeSheet];
        container.innerHTML = '';
        container.className = 'spreadsheet-grid';
        
        // Corner cell
        const corner = document.createElement('div');
        corner.className = 'spreadsheet-cell header';
        container.appendChild(corner);
        
        // Column headers
        for (let col = 0; col < this.gridCols; col++) {
            const cell = document.createElement('div');
            cell.className = 'spreadsheet-cell header';
            cell.textContent = this.getColName(col);
            container.appendChild(cell);
        }
        
        // Rows
        for (let row = 1; row <= this.gridRows; row++) {
            // Row header
            const rowHeader = document.createElement('div');
            rowHeader.className = 'spreadsheet-cell row-header';
            rowHeader.textContent = row;
            container.appendChild(rowHeader);
            
            // Cells
            for (let col = 0; col < this.gridCols; col++) {
                const cellRef = `${this.getColName(col)}${row}`;
                const cellData = sheet.data[cellRef] || { value: '', formula: '' };
                
                const cell = document.createElement('div');
                cell.className = 'spreadsheet-cell';
                cell.dataset.ref = cellRef;
                
                if (sheet.selectedCell === cellRef) {
                    cell.classList.add('selected');
                }
                
                const displayValue = cellData.formula ? this.evaluateFormula(cellData.formula) : cellData.value;
                cell.textContent = displayValue;
                
                cell.onclick = () => this.selectCell(cellRef);
                cell.ondblclick = () => this.editCell(cellRef);
                
                container.appendChild(cell);
            }
        }
    },
    
    selectCell(ref) {
        const sheet = this.sheets[this.activeSheet];
        sheet.selectedCell = ref;
        this.renderGrid();
    },
    
    editCell(ref) {
        const sheet = this.sheets[this.activeSheet];
        const cellData = sheet.data[ref] || { value: '', formula: '' };
        const cell = document.querySelector(`[data-ref="${ref}"]`);
        
        const input = document.createElement('input');
        input.value = cellData.formula || cellData.value;
        input.onblur = () => this.saveCell(ref, input.value);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        };
        
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
    },
    
    saveCell(ref, value) {
        const sheet = this.sheets[this.activeSheet];
        
        if (!sheet.data[ref]) {
            sheet.data[ref] = {};
        }
        
        if (value.startsWith('=')) {
            sheet.data[ref].formula = value;
            sheet.data[ref].value = '';
        } else {
            sheet.data[ref].value = value;
            sheet.data[ref].formula = '';
        }
        
        this.renderGrid();
    },
    
    evaluateFormula(formula) {
        if (!formula || !formula.startsWith('=')) return formula;
        
        const expr = formula.substring(1).toUpperCase();
        
        // Handle SUM
        if (expr.includes('SUM(')) {
            const match = expr.match(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
            if (match) {
                const [_, startCol, startRow, endCol, endRow] = match;
                return this.calculateSum(startCol + startRow, endCol + endRow);
            }
        }
        
        // Handle AVERAGE
        if (expr.includes('AVERAGE(')) {
            const match = expr.match(/AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
            if (match) {
                const [_, startCol, startRow, endCol, endRow] = match;
                const sum = this.calculateSum(startCol + startRow, endCol + endRow);
                const count = this.countCells(startCol + startRow, endCol + endRow);
                return count > 0 ? (sum / count).toFixed(2) : 0;
            }
        }
        
        // Simple math operations
        try {
            // Replace cell references with values
            let evalExpr = expr;
            const cellRefs = expr.match(/[A-Z]+\d+/g);
            if (cellRefs) {
                const sheet = this.sheets[this.activeSheet];
                cellRefs.forEach(ref => {
                    const cellData = sheet.data[ref];
                    const val = cellData ? (cellData.formula ? this.evaluateFormula(cellData.formula) : cellData.value) : '';
                    evalExpr = evalExpr.replace(ref, parseFloat(val) || 0);
                });
            }
            return eval(evalExpr);
        } catch (e) {
            return '#ERROR';
        }
    },
    
    calculateSum(startRef, endRef) {
        const sheet = this.sheets[this.activeSheet];
        let sum = 0;
        
        const startCol = startRef.charCodeAt(0);
        const startRow = parseInt(startRef.substr(1));
        const endCol = endRef.charCodeAt(0);
        const endRow = parseInt(endRef.substr(1));
        
        for (let col = startCol; col <= endCol; col++) {
            for (let row = startRow; row <= endRow; row++) {
                const ref = String.fromCharCode(col) + row;
                const cellData = sheet.data[ref];
                const val = cellData ? (cellData.formula ? this.evaluateFormula(cellData.formula) : cellData.value) : '';
                sum += parseFloat(val) || 0;
            }
        }
        return sum;
    },
    
    countCells(startRef, endRef) {
        const startCol = startRef.charCodeAt(0);
        const startRow = parseInt(startRef.substr(1));
        const endCol = endRef.charCodeAt(0);
        const endRow = parseInt(endRef.substr(1));
        return (endCol - startCol + 1) * (endRow - startRow + 1);
    },
    
    importFromDatabase(trips = null) {
        const data = trips || state.trips;
        const sheet = this.sheets[this.activeSheet];
        
        // Clear existing data
        sheet.data = {};
        
        // Headers
        const headers = ['Trip ID', 'Date', 'Driver', 'Van', 'Destination', 'Miles', 'Wait'];
        headers.forEach((h, i) => {
            sheet.data[`${this.getColName(i)}1`] = { value: h, formula: '' };
        });
        
        // Data rows
        data.forEach((trip, rowIndex) => {
            const row = rowIndex + 2;
            sheet.data[`A${row}`] = { value: trip.id, formula: '' };
            sheet.data[`B${row}`] = { value: trip.date, formula: '' };
            sheet.data[`C${row}`] = { value: trip.driverName, formula: '' };
            sheet.data[`D${row}`] = { value: trip.vanId, formula: '' };
            sheet.data[`E${row}`] = { value: trip.destination, formula: '' };
            sheet.data[`F${row}`] = { value: trip.totalMiles, formula: '' };
            sheet.data[`G${row}`] = { value: trip.totalWait, formula: '' };
        });
        
        this.renderGrid();
    }
};

// Main Application Module
const app = {
    init() {
        initializeMockData();
        
        // Check for existing session
        if (auth.checkSession()) {
            // Already handled in checkSession
        } else {
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appContainer').classList.add('hidden');
        }
        
        // Event listeners
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('employeeId').value;
            const pass = document.getElementById('password').value;
            
            if (auth.login(id, pass)) {
                app.showToast('Welcome back, ' + state.currentUser.name);
            } else {
                app.showToast('Invalid credentials', 'error');
            }
        });
        
        document.getElementById('tripSheetForm').addEventListener('submit', tripSheet.submit.bind(tripSheet));
        
        // Initialize modules
        tripSheet.init();
        spreadsheet.init();
        
        // Check dark mode preference
        if (localStorage.getItem('darkMode') === 'light') {
            state.darkMode = false;
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('bg-slate-900', 'text-slate-100');
            document.body.classList.add('bg-white', 'text-slate-900');
        } else {
            document.documentElement.classList.add('dark');
        }
    },
    
    navigate(viewName) {
        state.currentView = viewName;
        
        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            tripSheet: 'Trip Sheet',
            database: 'Trip Database',
            spreadsheet: 'Spreadsheet Workspace'
        };
        document.getElementById('pageTitle').textContent = titles[viewName];
        
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        
        // Show selected view
        document.getElementById(`view-${viewName}`).classList.remove('hidden');
        document.getElementById(`view-${viewName}`).classList.add('animate-fade-in');
        
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (viewName === 'tripSheet') viewName = 'tripSheet';
        
        // Special handling
        if (viewName === 'database') databaseView.load();
        if (viewName === 'dashboard') this.refreshDashboard();
        
        // Remove animation class after animation
        setTimeout(() => {
            document.getElementById(`view-${viewName}`)?.classList.remove('animate-fade-in');
        }, 300);
    },
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('-translate-x-full');
        sidebar.classList.toggle('absolute');
        sidebar.classList.toggle('z-50');
        sidebar.classList.toggle('h-full');
    },
    
    toggleDarkMode() {
        state.darkMode = !state.darkMode;
        const isDark = state.darkMode;
        
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.body.classList.remove('bg-white', 'text-slate-900');
            document.body.classList.add('bg-slate-900', 'text-slate-100');
            localStorage.setItem('darkMode', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('bg-slate-900', 'text-slate-100');
            document.body.classList.add('bg-white', 'text-slate-900');
            localStorage.setItem('darkMode', 'light');
        }
    },
    
    refreshDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const todaysTrips = state.trips.filter(t => t.date === today);
        
        document.getElementById('dashTripCount').textContent = todaysTrips.length;
        document.getElementById('dashTotalMiles').textContent = todaysTrips.reduce((sum, t) => sum + t.totalMiles, 0);
        document.getElementById('dashTotalWait').textContent = todaysTrips.reduce((sum, t) => sum + t.totalWait, 0);
        
        const activeDrivers = new Set(todaysTrips.map(t => t.driverName)).size;
        document.getElementById('dashActiveDrivers').textContent = activeDrivers;
        
        // Recent trips table
        const recentTable = document.getElementById('recentTripsTable');
        recentTable.innerHTML = '';
        const recent = [...state.trips].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 5);
        recent.forEach(trip => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-700/50';
            row.innerHTML = `
                <td class="py-2 font-mono text-xs">${trip.id.substr(-6)}</td>
                <td class="py-2">${trip.driverName}</td>
                <td class="py-2">${trip.destination}</td>
                <td class="py-2 text-right">${trip.totalMiles}</td>
            `;
            recentTable.appendChild(row);
        });
    },
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toastMessage');
        
        msgEl.textContent = message;
        
        // Set color based on type
        const icon = toast.querySelector('i');
        if (type === 'error') {
            icon.className = 'w-5 h-5 text-red-400';
            icon.setAttribute('data-feather', 'alert-circle');
        } else if (type === 'warning') {
            icon.className = 'w-5 h-5 text-yellow-400';
            icon.setAttribute('data-feather', 'alert-triangle');
        } else {
            icon.className = 'w-5 h-5 text-green-400';
            icon.setAttribute('data-feather', 'check-circle');
        }
        
        feather.replace();
        toast.classList.add('toast-show');
        
        setTimeout(() => {
            toast.classList.remove('toast-show');
        }, 3000);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});