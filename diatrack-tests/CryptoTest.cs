using Diatrack.Utilities;
using NUnit.Framework;
using System.Text;

namespace diatrack_tests
{
    [TestFixture]
    public class CryptoTest
    {
        readonly byte[] key = Encoding.UTF8.GetBytes("607e2417ce4f05fdaec20c317ea96bc4");

        [Test]
        public void TestEncrypt()
        {
            string plainText = "Hello world!";
            string cipherText = Crypto.EncryptString(plainText, key);
            string decryptedText = Crypto.DecryptString(cipherText, key);

            Assert.AreEqual(plainText, decryptedText);
        }
    }
}
