import crypto from "node:crypto";

function normalizeSecretKey(secretKey) {
  return secretKey.slice(0, 16).padEnd(16, "0");
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function deriveOperationKey(secretKey, order) {
  const normalizedKey = normalizeSecretKey(secretKey);

  const key = Buffer.from(normalizedKey, "utf8");

  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(order, "utf8"),
    cipher.final(),
  ]);

  return encrypted.toString("base64");
}

export function createMerchantParameters(parameters) {
  const json = JSON.stringify(parameters);

  return encodeBase64Url(json);
}

export function createMerchantSignature({
  secretKey,
  order,
  merchantParameters,
}) {
  const operationKey = deriveOperationKey(secretKey, order);

  const signature = crypto
    .createHmac("sha512", operationKey)
    .update(merchantParameters)
    .digest();

  return signature.toString("base64url");
}
export function decodeMerchantParameters(merchantParameters) {
  const json = Buffer.from(merchantParameters, "base64url").toString("utf8");

  return JSON.parse(json);
}

export function verifyMerchantSignature({
  secretKey,
  merchantParameters,
  receivedSignature,
}) {
  const parameters = decodeMerchantParameters(merchantParameters);

  const order = parameters.Ds_Order || parameters.DS_ORDER;

  if (!order) {
    return false;
  }

  const calculatedSignature = createMerchantSignature({
    secretKey,
    order,
    merchantParameters,
  });

  const calculatedBuffer = Buffer.from(calculatedSignature);

  const receivedBuffer = Buffer.from(receivedSignature);

  if (calculatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(calculatedBuffer, receivedBuffer);
}
