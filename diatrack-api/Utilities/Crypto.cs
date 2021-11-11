using System;
using System.IO;
using System.Security.Cryptography;

namespace Diatrack.Utilities
{
    public class Crypto
    {
        // Length of the AES IV in bytes
        const int IV_SIZE_BYTES = 16;

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
        /// <param name="key">AES key bytes</param>
        /// <returns></returns>
        public static string EncryptString(string plainText, byte[] key)
        {
            if (plainText == null || plainText.Length <= 0)
                throw new ArgumentNullException(nameof(plainText));
            if (key == null || key.Length <= 0)
                throw new ArgumentNullException(nameof(key));
            
            byte[] encrypted;

            // Create an AesManaged object with the specified key and IV.
            using (AesManaged aesAlg = new())
            {
                aesAlg.Key = key;
                
                // Create an encryptor to perform the stream transform.
                ICryptoTransform encryptor = aesAlg.CreateEncryptor();

                // Create the streams used for encryption.
                using (MemoryStream msEncrypt = new())
                {
                    // Write the IV to the beginning of the stream
                    msEncrypt.Write(aesAlg.IV, 0, aesAlg.IV.Length);

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
        /// <param name="key">AES key bytes</param>
        /// <returns>Plaintext string</returns>
        public static string DecryptString(string cipherText, byte[] key)
        {
            // Check arguments.
            if (cipherText == null || cipherText.Length <= 0)
                throw new ArgumentNullException(nameof(cipherText));
            if (key == null || key.Length <= 0)
                throw new ArgumentNullException(nameof(key));
            if (cipherText.Length < IV_SIZE_BYTES)
                throw new ArgumentException("Size of the encrypted message must be at least the expected length of the IV");

            // Create an AesManaged object with the specified key and IV.
            using (AesManaged aesAlg = new())
            {
                aesAlg.Key = key;
                
                // Create the streams used for decryption.
                using (MemoryStream msDecrypt = new(Convert.FromBase64String(cipherText)))
                {
                    // Read the IV from the stream
                    byte[] iv = new byte[IV_SIZE_BYTES];
                    msDecrypt.Read(iv, 0, IV_SIZE_BYTES);
                    aesAlg.IV = iv;

                    // Create a decryptor to perform the stream transform.
                    ICryptoTransform decryptor = aesAlg.CreateDecryptor();

                    using (CryptoStream csDecrypt = new(msDecrypt, decryptor, CryptoStreamMode.Read))
                    {
                        using (StreamReader srDecrypt = new(csDecrypt))
                        {
                            // Read the decrypted bytes from the decrypting stream and place them in a string
                            return srDecrypt.ReadToEnd();
                        }
                    }
                }
            }
        }
    }
}
