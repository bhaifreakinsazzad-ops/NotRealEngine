import crypto from "crypto";
import { type VerifiedPaymentEvent } from "./types";

/**
 * Constant-time comparison between two hex strings to prevent timing attacks.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies standard HMAC-SHA256 signature against raw body string.
 */
export function verifyHmacSha256(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret || !rawBody) return false;
  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqualHex(computed, signature);
}

/**
 * Verifies Stripe webhook signature header format: `t=<timestamp>,v1=<signature>`.
 * Enforces timestamp tolerance window (default 300 seconds / 5 minutes) to protect against replay attacks.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): { valid: boolean; reason?: string } {
  if (!signatureHeader || !secret) {
    return { valid: false, reason: "Missing signature header or webhook secret" };
  }

  const items = signatureHeader.split(",");
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const item of items) {
    const [key, value] = item.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    return { valid: false, reason: "Malformed Stripe signature header" };
  }

  const tsNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(tsNum) || Math.abs(now - tsNum) > toleranceSeconds) {
    return { valid: false, reason: "Stripe signature timestamp outside tolerance window" };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const computed = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const matched = signatures.some((sig) => timingSafeEqualHex(computed, sig));
  return { valid: matched, reason: matched ? undefined : "Stripe signature mismatch" };
}

/**
 * Verifies SSLCommerz IPN POST payload.
 * SSLCommerz IPN includes `verify_sign` and `verify_key` which are validated against store password.
 */
export function verifySslCommerzIpn(
  params: Record<string, string>,
  storePassword: string
): { valid: boolean; reason?: string } {
  if (!storePassword) {
    return { valid: false, reason: "Missing store password for SSLCommerz IPN verification" };
  }

  const verifySign = params.verify_sign;
  const verifyKey = params.verify_key;
  if (!verifySign || !verifyKey) {
    return { valid: false, reason: "Missing SSLCommerz verify_sign or verify_key" };
  }

  // SSLCommerz creates MD5/SHA256 signature from sorted parameter keys separated by commas
  const keyList = verifyKey.split(",");
  let hashString = "";
  for (const k of keyList) {
    if (params[k]) {
      hashString += `${k}=${params[k]}&`;
    }
  }
  hashString += `store_passwd=${crypto.createHash("md5").update(storePassword).digest("hex")}`;
  const computed = crypto.createHash("md5").update(hashString).digest("hex");

  const valid = timingSafeEqualHex(computed, verifySign);
  return { valid, reason: valid ? undefined : "SSLCommerz IPN signature mismatch" };
}

/**
 * Universal webhook parser and verifier.
 * Returns verified payment event only if the cryptographic signature is verified.
 */
export function parseAndVerifyPaymentWebhook(
  rawBodyText: string,
  headers: Headers,
  options: {
    webhookSecret?: string;
    storePassword?: string;
    provider?: string;
  }
): { valid: boolean; event?: VerifiedPaymentEvent; error?: string } {
  const secret = options.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, error: "Payment webhook secret not configured on server." };
  }

  // Check Stripe signature header
  const stripeSig = headers.get("stripe-signature");
  if (stripeSig) {
    const check = verifyStripeSignature(rawBodyText, stripeSig, secret);
    if (!check.valid) {
      return { valid: false, error: check.reason ?? "Invalid Stripe signature" };
    }

    try {
      const payload = JSON.parse(rawBodyText);
      const eventType = payload.type;
      const dataObj = payload.data?.object;

      if (eventType === "payment_intent.succeeded" || eventType === "checkout.session.completed") {
        const orderId = dataObj.metadata?.orderId;
        const amountMinor = dataObj.amount || dataObj.amount_total;
        const currency = (dataObj.currency || "BDT").toUpperCase();

        if (!orderId || !amountMinor) {
          return { valid: false, error: "Missing required order metadata in Stripe event" };
        }

        return {
          valid: true,
          event: {
            provider: "stripe",
            providerEventId: payload.id,
            orderId,
            amountMinor,
            currency: currency === "USD" ? "USD" : "BDT",
            status: "paid",
            transactionId: dataObj.id,
            rawEvent: payload
          }
        };
      }

      return { valid: false, error: `Unhandled Stripe event type: ${eventType}` };
    } catch {
      return { valid: false, error: "Malformed Stripe JSON payload" };
    }
  }

  // Check standard HMAC signature in x-webhook-signature header
  const hmacSig = headers.get("x-webhook-signature");
  if (hmacSig) {
    const valid = verifyHmacSha256(rawBodyText, hmacSig, secret);
    if (!valid) {
      return { valid: false, error: "Invalid HMAC-SHA256 signature in x-webhook-signature header" };
    }

    try {
      const payload = JSON.parse(rawBodyText);
      // Ensure required schema attributes are present
      return {
        valid: true,
        event: payload as VerifiedPaymentEvent
      };
    } catch {
      return { valid: false, error: "Malformed JSON payload" };
    }
  }

  return { valid: false, error: "No recognized payment signature header provided." };
}
