using DiatrackPoller.Configuration;
using Microsoft.Extensions.Options;
using Serilog;
using System;

namespace DiatrackPoller.Services
{
    public interface IHealthService
    {
        public bool IsHealthy();
        public void RegisterBglQuery();
    }

    public class HealthService : IHealthService
    {
        private readonly DexcomPollerConfiguration _pollerConfig;
        private DateTime _lastBglPoll = DateTime.Now;

        public HealthService(IOptions<DexcomPollerConfiguration> pollerConfig)
        {
            _pollerConfig = pollerConfig.Value;
        }

        public bool IsHealthy()
        {
            // If a query was performed within twice the query frequency, report the poller service as healthy
            TimeSpan timeSinceLastPoll = DateTime.Now - _lastBglPoll;
            if (timeSinceLastPoll.TotalSeconds > 2 * _pollerConfig.BglQueryFrequencySeconds)
            {
                Log.Warning($"No query performed for {timeSinceLastPoll.TotalSeconds} seconds, which is longer than the query frequency of {_pollerConfig.BglQueryFrequencySeconds} seconds");
                return false;
            }

            return true;
        }

        public void RegisterBglQuery()
        {
            _lastBglPoll = DateTime.Now;
        }
    }
}
