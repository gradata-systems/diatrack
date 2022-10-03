import {Inject, Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {OAuthService} from 'angular-oauth2-oidc';
import {BASE_PATH} from "../api/variables";

@Injectable()
export class AppAuthInterceptor implements HttpInterceptor
{
    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private oAuthService: OAuthService
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
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
