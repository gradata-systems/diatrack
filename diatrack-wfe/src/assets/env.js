(function (window) {
    window['env'] = {
        apiBasePath: '/api',
        openId: {
            authorityUrl: 'https://auth.gradata.com.au/realms/diatrack',
            audience: 'diatrack',
            clientId: 'diatrack',
            scopes: ['openid', 'profile', 'email', 'offline_access']
        }
    };
})(this);
