// Google Sheets Integration Module
const sheetsIntegration = {
    CLIENT_ID: 'GOOGLECLIENTID.apps.googleusercontent.com', // Replace with your Client ID
    API_KEY: 'GOOGLEAPIKEY', // Replace with your API Key
    SHEET_ID: 'GOOGLESHEETID', // Replace with your Sheet ID
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    tokenClient: null,
    isSignedIn: false,
    accessToken: null,

    init() {
        // Initialize GIS (Google Identity Services)
        if (window.google && google.accounts) {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPE,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        this.accessToken = tokenResponse.access_token;
                        this.isSignedIn = true;
                        this.updateUI();
                        app.showToast('Connected to Google Sheets');
                        this.loadTripsFromSheet();
                    }
                },
                error_callback: (error) => {
                    console.error('GIS Error:', error);
                    app.showToast('Google Sign-in failed', 'error');
                }
            });
        }

        // Initialize GAPI (Google API Client)
        if (window.gapi) {
            gapi.load('client', () => {
                gapi.client.init({
                    apiKey: this.API_KEY,
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                }).then(() => {
                    console.log('GAPI initialized');
                }).catch(error => {
                    console.error('GAPI init error:', error);
                });
            });
        }
    },

    signIn() {
        if (this.tokenClient) {
            // Request an access token
            this.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            app.showToast('Google Identity Services not loaded. Please check configuration.', 'error');
        }
    },

    signOut() {
        if (this.accessToken) {
            // Revoke the token
            if (window.google && google.accounts) {
                google.accounts.oauth2.revoke(this.accessToken, () => {
                    this.accessToken = null;
                    this.isSignedIn = false;
                    this.updateUI();
                    app.showToast('Disconnected from Google Sheets');
                });
            }
        }