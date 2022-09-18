using Diatrack.Converters;
using Elasticsearch.Net;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Diatrack.Models
{
    public class UserEntity : UserEntityParams
    {
        public string Id { get; set; }

        public DateTime Created { get; set; }

        public string CreatedBy { get; set; }

        public bool IsDeleted { get; set; }

        public UserEntity(UserEntityParams userEntityParams)
            : base(userEntityParams)
        { }
    }

    public class UserEntityParams
    {
        [StringEnum]
        public UserEntityType Type { get; set; }

        public string Name { get; set; }

        [JsonConverter(typeof(DictionaryStringObjectJsonConverter))]
        public Dictionary<string, object> Properties { get; set; }

        public UserEntityParams()
        { }

        public UserEntityParams(UserEntityParams userEntityParams)
        {
            Type = userEntityParams.Type;
            Name = userEntityParams.Name;
            Properties = userEntityParams.Properties;
        }
    }

    public enum UserEntityType
    {
        Food,
        Insulin
    }
}
