using Diatrack.Configuration;
using Diatrack.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Versioning;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog.Context;
using Serilog;
using System.IdentityModel.Tokens.Jwt;
using System;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Linq;
using Diatrack.Models;
using Microsoft.AspNetCore.Http;

namespace Diatrack
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add services, available via DI
            services.AddSingleton<IUserService, UserService>();
            services.AddHttpClient<IUserService, UserService>();
            services.AddSingleton<ElasticDataProvider>();

            ConfigureAuthentication(services);
            services.AddAuthorization();

            // Provide access to the HTTP context within authorisation handlers
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            services.AddResponseCompression();

            services
                .AddControllers()
                .AddJsonOptions(opts =>
                {
                    // Serialise enums as strings, instead as numbers (default)
                    JsonStringEnumConverter enumConverter = new();
                    opts.JsonSerializerOptions.Converters.Add(enumConverter);
                    opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
                });

            services.AddApiVersioning(config =>
            {
                config.DefaultApiVersion = new ApiVersion(1, 0);
                config.AssumeDefaultVersionWhenUnspecified = true;
                config.ReportApiVersions = true;
                config.ApiVersionReader = ApiVersionReader.Combine(
                    new QueryStringApiVersionReader("version"),
                    new UrlSegmentApiVersionReader() // Used for compatibility with emulated APIs like Nightscout
                );
            });

            services.AddVersionedApiExplorer(config =>
            {
                config.GroupNameFormat = "'v'VVV";
                config.SubstituteApiVersionInUrl = true;
            });

            services.AddSwaggerGen();
            services.ConfigureOptions<SwaggerConfiguration>();

            services.AddOptions();
            services.Configure<AppConfiguration>(Configuration.GetSection("App"));
            services.Configure<DexcomConfiguration>(Configuration.GetSection("Dexcom"));
            services.Configure<ElasticConfiguration>(Configuration.GetSection("Elastic"));
            services.Configure<OpenIdConfiguration>(Configuration.GetSection("OpenId"));
        }

        private void ConfigureAuthentication(IServiceCollection services)
        {
            IConfigurationSection authSettings = Configuration.GetSection("OpenId");
            string authority = authSettings.GetValue<string>("AuthorityUrl");
            string audience = authSettings.GetValue<string>("Audience");
            string clientId = authSettings.GetValue<string>("ClientId");

            if (string.IsNullOrEmpty(authority))
                throw new Exception("Authentication authority not specified");
            if (string.IsNullOrEmpty(audience))
                throw new Exception("Authentication audience not specified");
            if (string.IsNullOrEmpty(clientId))
                throw new Exception("Authentication client ID not specified");

            try
            {
                services
                    .AddAuthentication((options) =>
                    {
                        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    })
                    .AddJwtBearer("Bearer", (options) =>
                    {
                        options.Authority = authority;
                        options.Audience = audience;
                        options.RequireHttpsMetadata = false;
                        options.Events = new JwtBearerEvents
                        {
                            OnAuthenticationFailed = (context) =>
                            {
                                string claimsSubjectId = null;

                                if (context.HttpContext.Request.Headers.TryGetValue("Authorization", out var headerValues))
                                {
                                    try
                                    {
                                        // Parse and extract the login name from the JWT claims
                                        string tokenString = Regex.Match(headerValues[0], "^Bearer (.+)").Groups[1].Value;
                                        var tokenHandler = new JwtSecurityTokenHandler();
                                        var token = tokenHandler.ReadToken(tokenString) as JwtSecurityToken;

                                        claimsSubjectId = token.Claims.FirstOrDefault((claim) => claim.Type == "sub").Value;
                                    }
                                    catch (Exception)
                                    {
                                        Log.Warning("JWT does not contain a claim 'sub'");
                                    }
                                }

                                using (LogContext.PushProperty("RemoteAddress", context.HttpContext.Connection.RemoteIpAddress))
                                using (LogContext.PushProperty("Reason", context.Exception.Message))
                                {
                                    if (claimsSubjectId != null)
                                        Log.Error("Authentication failed for claims subject '{UserId}'", claimsSubjectId);
                                    else
                                        Log.Error("Authentication failed");
                                }

                                return Task.CompletedTask;
                            },
                            OnForbidden = (context) =>
                            {
                                using (LogContext.PushProperty("RemoteAddress", context.HttpContext.Connection.RemoteIpAddress))
                                {
                                    Log.Error("Forbidden");
                                }

                                return Task.CompletedTask;
                            },
                            OnTokenValidated = (context) =>
                            {
                                var identity = new ClaimsIdentity(context.Principal);
                                using (LogContext.PushProperty("RemoteAddress", context.HttpContext.Connection.RemoteIpAddress))
                                using (LogContext.PushProperty("UserId", identity.Id))
                                {
                                    Log.Debug("JWT validated");
                                }

                                return Task.CompletedTask;
                            }
                        };
                    });
            }
            catch (Exception ex)
            {
                Log
                    .ForContext("Authority", authority)
                    .ForContext("Audience", audience)
                    .Fatal(ex, "Authentication configuration parameters are not set or were invalid");

                throw new ArgumentException(ex.Message);
            }
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IApiVersionDescriptionProvider versionProvider)
        {
            app.UseResponseCompression();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(config =>
                {
                    foreach (ApiVersionDescription description in versionProvider.ApiVersionDescriptions)
                    {
                        config.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json", description.GroupName.ToUpperInvariant());
                    }
                });
            }

            // Use Serilog for request logging as .Net framework logging is set to `Warning` level
            app.UseSerilogRequestLogging();

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
