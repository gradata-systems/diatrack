using Diatrack.Models;
using Diatrack.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Diatrack.Controllers.V1
{
    [Authorize]
    [ApiVersion("1.0")]
    [Route("[controller]")]
    [ApiController]
    public class UserEntityController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IUserService _userService;

        public UserEntityController(ElasticDataProvider elasticProvider, IUserService userService)
        {
            _elasticClient = elasticProvider.NestClient;
            _userService = userService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserEntity>>> Get([FromQuery] int? count, [FromQuery] UserEntityType? type)
        {
            User user = await _userService.GetUser();

            ISearchResponse<UserEntity> response = await _elasticClient.SearchAsync<UserEntity>(s => s
                .Size(count)
                .Query(q => q
                    .Bool(b => b
                        .Must(
                            mu1 => mu1.Term(t => t.CreatedBy, user.Id),
                            mu2 => type != null ? mu2.Term(t => t.Type, Enum.GetName(type.Value)) : null
                        )
                    )
                )
            );

            if (response.IsValid)
            {
                return Ok(response.Hits.Select(hit =>
                {
                    hit.Source.Id = hit.Id;
                    return hit.Source;
                }));
            }
            else
            {
                return Problem(response.OriginalException?.Message);
            }
        }

        [HttpPut]
        public async Task<ActionResult<UserEntity>> Create([FromBody] UserEntityParams userEntityParams)
        {
            User user = await _userService.GetUser();

            UserEntity userEntity = new UserEntity(userEntityParams)
            {
                Created = DateTime.UtcNow,
                CreatedBy = user.Id,
                IsDeleted = false
            };

            IndexResponse response = await _elasticClient.IndexDocumentAsync(userEntity);
            if (response.IsValid)
            {
                Log.Information("Created user entity {Name} of type {Type} for {UserId}", userEntity.Name, userEntity.Type, user.Id);

                userEntity.Id = response.Id;

                return Ok(userEntity);
            }
            else
            {
                return Problem(response.OriginalException?.Message);
            }
        }

        [HttpPost("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UserEntityParams entityParams)
        {
            User user = await _userService.GetUser();

            GetResponse<UserEntity> getResponse = await _elasticClient.GetAsync(new DocumentPath<UserEntity>(id));
            if (getResponse.IsValid)
            {
                // Check whether the user created this entity
                UserEntity entity = getResponse.Source;
                if (entity.CreatedBy != user.Id)
                {
                    return Unauthorized();
                }

                entity.Type = entityParams.Type;
                entity.Name = entityParams.Name;
                entity.Properties = entityParams.Properties;

                UpdateResponse<UserEntity> updateResponse = await _elasticClient.UpdateAsync(new DocumentPath<UserEntity>(id), u => u.Doc(entity));
                if (updateResponse.IsValid)
                {
                    return Ok();
                }
                else
                {
                    return Problem(updateResponse.OriginalException?.Message);
                }
            }
            else
            {
                return NotFound();
            }
        }

        [HttpPost("{id}/isDeleted")]
        public async Task<IActionResult> UpdateIsDeleted(string id, [BindRequired][FromQuery] bool deleted)
        {
            User user = await _userService.GetUser();

            GetResponse<UserEntity> getResponse = await _elasticClient.GetAsync(new DocumentPath<UserEntity>(id));
            if (getResponse.IsValid)
            {
                // Check whether the user created this entity
                UserEntity entity = getResponse.Source;
                if (entity.CreatedBy != user.Id)
                {
                    return Unauthorized();
                }

                entity.IsDeleted = deleted;

                UpdateResponse<UserEntity> updateResponse = await _elasticClient.UpdateAsync(new DocumentPath<UserEntity>(id), u => u.Doc(entity));
                if (updateResponse.IsValid)
                {
                    return Ok();
                }
                else
                {
                    return Problem(updateResponse.OriginalException?.Message);
                }
            }
            else
            {
                return NotFound();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            User user = await _userService.GetUser();

            GetResponse<UserEntity> getResponse = await _elasticClient.GetAsync(new DocumentPath<UserEntity>(id));
            if (getResponse.IsValid)
            {
                // Check whether the user created this entity
                UserEntity entity = getResponse.Source;
                if (entity.CreatedBy != user.Id)
                {
                    return Unauthorized();
                }

                DeleteResponse deleteResponse = await _elasticClient.DeleteAsync(new DocumentPath<UserEntity>(id));
                if (deleteResponse.IsValid)
                {
                    return Ok();
                }
                else
                {
                    return Problem(deleteResponse.OriginalException?.Message);
                }
            }
            else
            {
                return NotFound();
            }
        }
    }
}
