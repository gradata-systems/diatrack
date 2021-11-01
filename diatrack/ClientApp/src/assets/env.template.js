(function(window) {
    window['env'] = {
        apiBasePath: '${APP_API_BASE_PATH}',
        clientId: '${APP_CLIENT_ID}',
        authority: '${APP_AUTHORITY}',
        knownAuthorities: ['${APP_KNOWN_AUTHORITY}'],
        redirectUri: '${APP_BASE_URI}',
        protectedResourceUris: [
            '${APP_BASE_URI}/*'
        ],
        scopes: '${APP_SCOPES}'.split(',').map(scope => scope.trim())
    };
})(this);
