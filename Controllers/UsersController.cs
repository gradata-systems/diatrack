using Diatrack.Models;
using Diatrack.Services;
using Microsoft.AspNetCore.Mvc;
using Nest;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Diatrack.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;

        public UsersController(ElasticDataProvider elasticProvider)
        {
            _elasticClient = elasticProvider.NestClient;
        }

        [HttpGet]
        public async Task<IReadOnlyCollection<User>> Get()
        {
            return (await _elasticClient.SearchAsync<User>()).Documents;
        }
    }
}
