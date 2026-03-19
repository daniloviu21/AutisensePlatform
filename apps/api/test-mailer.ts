import * as dotenv from "dotenv";
dotenv.config();

import { sendMfaCode } from "./src/utils/mailer";

async function test() {
  try {
    console.log("Sending...");
    await sendMfaCode("danielpedido150@gmail.com", "123456");
    console.log("Success");
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}

test();
