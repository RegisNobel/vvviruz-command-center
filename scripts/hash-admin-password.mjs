import {randomBytes, scryptSync} from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash:admin-password -- "your-password"');
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const derivedKey = scryptSync(password, salt, 64);

console.log(`scrypt$${salt}$${derivedKey.toString("hex")}`);
