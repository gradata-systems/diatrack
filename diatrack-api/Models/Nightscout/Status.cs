using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Diatrack.Models.Nightscout
{
    public class ServerStatus
    {
        public bool ApiEnabled { get; set; }

        public bool CarePortalEnabled { get; set; }

        public string Head { get; set; }

        public string Name { get; set; }

        public string Version { get; set; }
    }
}
