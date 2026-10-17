
import { Retell } from "retell-sdk";

console.log(
  "Invalid signature result:",
  Retell.verify("test", "test-api-key", "invalid-signature")
);
