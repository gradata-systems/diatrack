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
            string plainText = "Hello world!_123@#$%";
            string cipherText = Crypto.EncryptString(plainText, key);
            string decryptedText = Crypto.DecryptString(cipherText, key);

            Assert.AreEqual(plainText, decryptedText);
        }

        [Test]
        public void TestSha1Hash()
        {
            const string source = "_o47pf_rn0WrZ_qfNbUDLw";
            const string hashed = "a2cfa690011ca0b6e71b725dcd596f8252fe886c";

            Assert.AreEqual(hashed, Crypto.Sha1Hash(source));
        }
    }
}
