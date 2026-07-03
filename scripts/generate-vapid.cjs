const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();
console.log("--- Add these to your .env file ---");
console.log("VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("\n--- IMPORTANT ---");
console.log("Copy the new VAPID_PUBLIC_KEY and replace the hardcoded key in src/lib/push-client.ts!");
