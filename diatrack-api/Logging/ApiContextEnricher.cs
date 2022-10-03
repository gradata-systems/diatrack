using Diatrack.Models;
using Microsoft.AspNetCore.Http;
using Serilog;
using Serilog.Configuration;
using Serilog.Core;
using Serilog.Events;
using System;

namespace Diatrack.Logging
{
    /// <summary>
    /// Custom Serilog enricher that adds user attribution and remote address properties to each log event where a HTTP context exists
    /// </summary>
    public class ApiContextEnricher : ILogEventEnricher
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ApiContextEnricher()
            : this(new HttpContextAccessor())
        { }

        public ApiContextEnricher(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
        {
            HttpContext httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
                return;

            string remoteIpAddress = null;
            string forwardedIpAddress = httpContext.Request.Headers["X-Real-IP"].ToString();
            if (forwardedIpAddress != default)
                remoteIpAddress = forwardedIpAddress;
            if (remoteIpAddress == null)
                remoteIpAddress = httpContext.Connection.RemoteIpAddress.ToString();

            logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("RemoteAddress", remoteIpAddress.ToString()));

            string userAgent = httpContext.Request.Headers["User-Agent"];
            if (!string.IsNullOrEmpty(userAgent))
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("Client.UserAgent", userAgent));

            var userIdentity = httpContext.User?.Identity;
            if (userIdentity != null)
            {
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("User.Authenticated", userIdentity.IsAuthenticated));

                if (userIdentity.IsAuthenticated)
                {
                    var claimsIdentity = new ClaimsIdentity(httpContext.User);

                    logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("User.Id", claimsIdentity.Id));

                    if (!string.IsNullOrEmpty(claimsIdentity.Name))
                        logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("User.Name", claimsIdentity.Name));
                    if (!string.IsNullOrEmpty(claimsIdentity.Email))
                        logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("User.EmailAddress", claimsIdentity.Email));
                }
            }
        }
    }

    public static class ApiContextEnricherConfigurationExtensions
    {
        public static LoggerConfiguration WithApiContext(this LoggerEnrichmentConfiguration config)
        {
            if (config == null)
                throw new ArgumentNullException(nameof(config));

            return config.With<ApiContextEnricher>();
        }
    }
}
