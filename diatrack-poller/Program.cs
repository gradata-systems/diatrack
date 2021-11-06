using Diatrack.Configuration;
using Diatrack.Services;
using DiatrackPoller.Configuration;
using DiatrackPoller.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using System;
using System.IO;

namespace DiatrackPoller
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureServices((hostContext, services) =>
                {
                    services.AddSingleton<ElasticDataProvider>();

                    services.AddHostedService<DexcomPollerService>();

                    services.AddOptions();
                    services.Configure<ElasticConfiguration>(hostContext.Configuration.GetSection("Elastic"));
                    services.Configure<DexcomConfiguration>(hostContext.Configuration.GetSection("Dexcom"));
                    services.Configure<DexcomPollerConfiguration>(hostContext.Configuration.GetSection("DexcomPoller"));
                })
                .UseSerilog((hostingContext, loggerConfiguration) => ConfigureLogging(hostingContext, loggerConfiguration));

        private static void ConfigureLogging(HostBuilderContext hostingContext, LoggerConfiguration loggerConfiguration)
        {
            loggerConfiguration
                .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
                .ReadFrom.Configuration(hostingContext.Configuration)
                .Enrich.FromLogContext();

            IConfigurationSection appLoggingConfig = hostingContext.Configuration.GetSection("Logging");

            try
            {
                bool logToConsole = appLoggingConfig.GetValue<bool>("Console:Enabled");

                if (logToConsole)
                    loggerConfiguration.WriteTo.Console(new RenderedCompactJsonFormatter());
            }
            catch (Exception ex)
            {
                throw new Exception("Invalid logging console configuration", ex);
            }

            try
            {
                bool logToFile = appLoggingConfig.GetValue<bool>("File:Enabled");
                string filePath = appLoggingConfig.GetValue<string>("File:Path");
                RollingInterval fileRollingInterval = appLoggingConfig.GetValue("File:RollingInterval", RollingInterval.Infinite);

                if (logToFile && !string.IsNullOrEmpty(filePath))
                {
                    string directoryPath = Path.GetDirectoryName(filePath);
                    if (!IsDirectoryWriteable(directoryPath))
                        throw new Exception($"Log directory '{directoryPath}' is not writeable");

                    loggerConfiguration.WriteTo.File(new CompactJsonFormatter(),
                        path: filePath,
                        rollingInterval: fileRollingInterval,
                        buffered: false
                    );
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Invalid logging configuration provided", ex);
            }
        }

        /// <summary>
        /// Determines whether the running process has file creation rights within a directory
        /// </summary>
        /// <param name="path">Path to the directory to test</param>
        /// <returns></returns>
        private static bool IsDirectoryWriteable(string path)
        {
            try
            {
                using FileStream fs = File.Create(Path.Combine(path, Path.GetRandomFileName()), 1, FileOptions.DeleteOnClose);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
