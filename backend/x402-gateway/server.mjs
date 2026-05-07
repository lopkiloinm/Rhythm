import express from "express";

import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const PORT = parseInt(process.env.RHYTHM_X402_PORT || "3001", 10);
const UPSTREAM_URL = process.env.RHYTHM_VERIFY_UPSTREAM || "http://127.0.0.1:3002/verify";

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
const PAY_TO_EVM = process.env.X402_PAY_TO_EVM;
const PRICE = process.env.X402_PRICE || "$0.001";
const EVM_NETWORK = process.env.X402_EVM_NETWORK || "eip155:84532"; // Base Sepolia

if (!PAY_TO_EVM) {
  throw new Error("Missing X402_PAY_TO_EVM (set to your receiving 0x... address).");
}

const app = express();

// We need raw body bytes to proxy without re-encoding.
app.use(express.raw({ type: "*/*", limit: "100mb" }));

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const server = new x402ResourceServer(facilitatorClient).register(EVM_NETWORK, new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      "POST /verify": {
        accepts: [
          {
            scheme: "exact",
            price: PRICE,
            network: EVM_NETWORK,
            payTo: PAY_TO_EVM,
          },
        ],
        description: "Rhythm verification (POST video base64).",
        mimeType: "application/json",
      },
    },
    server,
  ),
);

app.post("/verify", async (req, res) => {
  const upstream = await fetch(UPSTREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
    },
    body: req.body,
  });

  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
  res.send(text);
});

app.listen(PORT, () => {
  console.log(`Rhythm x402 gateway listening on http://0.0.0.0:${PORT}/verify`);
  console.log(`Upstream verifier: ${UPSTREAM_URL}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
  console.log(`Accepts: ${EVM_NETWORK} price=${PRICE} payTo=${PAY_TO_EVM}`);
});

