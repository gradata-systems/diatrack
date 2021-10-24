import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {OAuthService} from 'angular-oauth2-oidc';
import {BASE_PATH} from "../api/variables";

const API_CONFIG_ENDPOINT = `${BASE_PATH}/config`;

@Injectable()
export class AppAuthInterceptor implements HttpInterceptor
{
    constructor(
        private oAuthService: OAuthService
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
        // If this is the `api/config` endpoint, don't set the authentication header
        if (req.url.toLowerCase() === API_CONFIG_ENDPOINT)
            return next.handle(req);

        const accessToken = this.getAccessToken();
        let headers = req.headers;

        if (accessToken)
        {
            // Add bearer token header
            const bearerHeader = `Bearer ${accessToken}`;
            headers = req.headers.set('Authorization', bearerHeader);
        }

        // Update the request headers
        req = req.clone({ headers });

        return next.handle(req);
    }

    /**
     * Returns the access token, for use with request headers
     */
    private getAccessToken(): string | null
    {
        const accessToken = this.oAuthService.getAccessToken();
        if (accessToken && accessToken !== '')
            return accessToken;
        else
            return null;
    }
}
