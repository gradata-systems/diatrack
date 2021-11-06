using System;

namespace Diatrack.Configuration
{
    public class AzureAdB2CConfiguration
    {
        public string Instance { get; set; }

        public string Domain { get; set; }

        public Guid ClientId { get; set; }

        public string SignUpSignInPolicyId { get; set; }
    }
}
