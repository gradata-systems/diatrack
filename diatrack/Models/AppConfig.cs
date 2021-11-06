using System;

namespace Diatrack.Models
{
    /// <summary>
    /// Configuration parameters passed to the frontend to enable it to function
    /// </summary>
    public class AppConfig
    {
        public Guid ClientId { get; set; }

        public string Authority { get; set; }

        public string RedirectUri { get; set; }

        public string[] Scopes { get; set; }
    }
}
