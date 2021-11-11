using System.Security;

namespace Diatrack.Configuration
{
    public class AppConfiguration
    {
        /// <summary>
        /// Base-64 encoded AES encryption key used to encrypt/decrypt secrets. Should only be used in development.
        /// In production, use `EncryptionKeyFile` instead.
        /// </summary>
        public string EncryptionKey { get; set; }

        /// <summary>
        /// Path to the file containing a 256-bit binary key used to decrypt secrets within the application
        /// </summary>
        public string EncryptionKeyFile { get; set; }
    }
}
