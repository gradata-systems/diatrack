using System;
using System.IO;
using System.Security.Cryptography;

namespace Diatrack.Utilities
{
    public class Crypto
    {
        public static string GenerateIv()
        {
            using (AesManaged aes = new())
            {
                return Convert.ToBase64String(aes.IV);
            }
        }

        public static string GenerateKey()
        {
            using (AesManaged aes = new())
            {
                return Convert.ToBase64String(aes.Key);
            }
        }

        /// <summary>
        /// Encrypts a string using AES
        /// </summary>
        /// <param name="plainText"></param>
        /// <param name="key">Base-64 encoded key</param>
        /// <param name="iv">Base-64 encoded initialisation vector</param>
        /// <returns></returns>
        public static string EncryptString(string plainText, string key, string iv)
        {
            // Check arguments.
            if (plainText == null || plainText.Length <= 0)
                throw new ArgumentNullException(nameof(plainText));
            if (key == null || key.Length <= 0)
                throw new ArgumentNullException(nameof(key));
            if (iv == null || iv.Length <= 0)
                throw new ArgumentNullException(nameof(iv));

            byte[] encrypted;

            // Create an AesManaged object with the specified key and IV.
            using (AesManaged aesAlg = new())
            {
                aesAlg.Key = Convert.FromBase64String(key);
                aesAlg.IV = Convert.FromBase64String(iv);

                // Create an encryptor to perform the stream transform.
                ICryptoTransform encryptor = aesAlg.CreateEncryptor(aesAlg.Key, aesAlg.IV);

                // Create the streams used for encryption.
                using (MemoryStream msEncrypt = new())
                {
                    using (CryptoStream csEncrypt = new(msEncrypt, encryptor, CryptoStreamMode.Write))
                    {
                        using (StreamWriter swEncrypt = new(csEncrypt))
                        {
                            // Write all data to the stream.
                            swEncrypt.Write(plainText);
                        }

                        encrypted = msEncrypt.ToArray();
                    }
                }
            }

            // Return the encrypted bytes from the memory stream.
            return Convert.ToBase64String(encrypted);
        }

        /// <summary>
        /// Decrypts an AES-encrypted string
        /// </summary>
        /// <param name="cipherText">Base-64 encoded encrypted string</param>
        /// <param name="key">Base-64 encoded key</param>
        /// <param name="iv">Base-64 encoded initialisation vector</param>
        /// <returns>Plaintext string</returns>
        public static string DecryptString(string cipherText, string key, string iv)
        {
            // Check arguments.
            if (cipherText == null || cipherText.Length <= 0)
                throw new ArgumentNullException(nameof(cipherText));
            if (key == null || key.Length <= 0)
                throw new ArgumentNullException(nameof(key));
            if (iv == null || iv.Length <= 0)
                throw new ArgumentNullException(nameof(iv));

            string plaintext = null;

            // Create an AesManaged object with the specified key and IV.
            using (AesManaged aesAlg = new())
            {
                aesAlg.Key = Convert.FromBase64String(key);
                aesAlg.IV = Convert.FromBase64String(iv);

                // Create a decryptor to perform the stream transform.
                ICryptoTransform decryptor = aesAlg.CreateDecryptor(aesAlg.Key, aesAlg.IV);

                // Create the streams used for decryption.
                using (MemoryStream msDecrypt = new(Convert.FromBase64String(cipherText)))
                {
                    using (CryptoStream csDecrypt = new(msDecrypt, decryptor, CryptoStreamMode.Read))
                    {
                        using (StreamReader srDecrypt = new(csDecrypt))
                        {
                            // Read the decrypted bytes from the decrypting stream and place them in a string
                            plaintext = srDecrypt.ReadToEnd();
                        }
                    }
                }
            }

            return plaintext;
        }
    }
}
