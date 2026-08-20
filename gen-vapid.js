const crypto = require('crypto');
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
// VAPID keys need to be uncompressed representation starting with 0x04
const publicKey = ecdh.getPublicKey();
const privateKey = ecdh.getPrivateKey('base64url');

// Base64url encode the public key
const pubKeyBase64url = publicKey.toString('base64url');

console.log('PUBLIC_KEY=' + pubKeyBase64url);
console.log('PRIVATE_KEY=' + privateKey);
