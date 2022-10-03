using System.Security.Claims;

namespace Diatrack.Models
{
    /// <summary>
    /// Represents a claims identity and parses a Claim object
    /// </summary>
    public class ClaimsIdentity
    {
        public string Id { get; set; }

        public string Name { get; set; }

        public string GivenName { get; set; }

        public string FamilyName { get; set; }

        public string Email { get; set; }

        public ClaimsIdentity(ClaimsPrincipal principal)
        {
            foreach (var claim in principal.Claims)
            {
                switch (claim.Type)
                {
                    case "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":
                        Id = claim.Value;
                        break;
                    case "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name":
                        Name = claim.Value;
                        break;
                    case "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname":
                        GivenName = claim.Value;
                        break;
                    case "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname":
                        FamilyName = claim.Value;
                        break;
                    case "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress":
                        Email = claim.Value;
                        break;
                }
            }
        }
    }
}
