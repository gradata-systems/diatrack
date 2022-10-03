(function (window) {
    window['env'] = {
        apiBasePath: '${APP_API_BASE_PATH}',
        openId: {
            authorityUrl: '${APP_OPENID_AUTHORITY_URL}',
            audience: '${APP_OPENID_AUDIENCE}',
            clientId: '${APP_OPENID_CLIENT_ID}',
            scopes: '${APP_OPENID_SCOPES}'.split(',').map(scope => scope.trim())
        }
    };
})(this);
