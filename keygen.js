const webpush = require('web-push');

if (!webpush) {
    console.log("Please install web-push first: npm install web-push");
    process.exit(1);
}

const vapidKeys = webpush.generateVAPIDKeys();

console.log("PUBLIC_KEY: " + vapidKeys.publicKey);
console.log("PRIVATE_KEY: " + vapidKeys.privateKey);
