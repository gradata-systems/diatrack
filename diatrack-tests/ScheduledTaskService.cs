using Microsoft.Extensions.Hosting;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Diatrack.Services
{
    public abstract class ScheduledTaskService : IHostedService, IDisposable
    {
        private System.Timers.Timer _timer;
        private readonly TimeSpan _interval;

        protected ScheduledTaskService(TimeSpan interval)
        {
            _interval = interval;
        }

        public virtual async Task StartAsync(CancellationToken cancellationToken)
        {
            await ScheduleJob(cancellationToken);
        }

        protected virtual async Task ScheduleJob(CancellationToken cancellationToken)
        {
            double intervalMillis = _interval.TotalMilliseconds;
            double timeUntilNext = Math.Floor(intervalMillis - (DateTimeOffset.Now.TimeOfDay.TotalMilliseconds % intervalMillis));

            if (timeUntilNext > 0)
            {
                _timer = new System.Timers.Timer(timeUntilNext);
                _timer.Elapsed += async (sender, args) =>
                {
                    _timer.Dispose();
                    _timer = null;

                    if (!cancellationToken.IsCancellationRequested)
                    {
                        await DoWork(cancellationToken);
                    }

                    if (!cancellationToken.IsCancellationRequested)
                    {
                        await ScheduleJob(cancellationToken);
                    }
                };

                _timer.Start();
            }

            await Task.CompletedTask;
        }

        protected abstract Task DoWork(CancellationToken cancellationToken);

        public virtual async Task StopAsync(CancellationToken cancellationToken)
        {
            _timer?.Stop();
            await Task.CompletedTask;
        }

        public virtual void Dispose()
        {
            _timer?.Dispose();
        }
    }
}
