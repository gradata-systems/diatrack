(function(window) {
    window['env'] = {
        apiBasePath: '/api',
        clientId: '397b9d98-83b4-451d-a271-e68f9675e277',
        authority: 'https://diatrack.b2clogin.com/diatrack.onmicrosoft.com/b2c_1_signin_signup',
        knownAuthorities: ['diatrack.b2clogin.com'],
        redirectUri: 'http://localhost:4200/',
        protectedResourceUris: [
            'http://localhost:4200/api/*',
            'https://localhost:5001/*'
        ],
        scopes: ['https://diatrack.onmicrosoft.com/397b9d98-83b4-451d-a271-e68f9675e277/owndata:readwrite']
    };
})(this);
