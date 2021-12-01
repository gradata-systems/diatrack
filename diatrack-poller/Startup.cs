using Diatrack.Configuration;
using Diatrack.Services;
using DiatrackPoller.Configuration;
using DiatrackPoller.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Versioning;

namespace DiatrackPoller
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
            services.AddSingleton<ElasticDataProvider>();
            services.AddSingleton<IHealthService, HealthService>();

            services.AddHostedService<DexcomPollerService>();

            services.AddControllers();

            services.AddApiVersioning(config =>
            {
                config.DefaultApiVersion = new ApiVersion(1, 0);
                config.AssumeDefaultVersionWhenUnspecified = true;
                config.ReportApiVersions = true;
                config.ApiVersionReader = new QueryStringApiVersionReader("version");
            });

            services.AddOptions();
            services.Configure<AppConfiguration>(Configuration.GetSection("App"));
            services.Configure<ElasticConfiguration>(Configuration.GetSection("Elastic"));
            services.Configure<DexcomConfiguration>(Configuration.GetSection("Dexcom"));
            services.Configure<DexcomPollerConfiguration>(Configuration.GetSection("DexcomPoller"));
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
