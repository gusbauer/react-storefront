import express from "express";
import cors from "cors";
import "dotenv/config";

import {
  createMerchantParameters,
  createMerchantSignature,
  decodeMerchantParameters,
  verifyMerchantSignature,
} from "./redsys.js";

const app = express();
const orders = new Map();

const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

app.use(express.json());

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "g-store-api",
    message: "Backend funcionando correctamente",
  });
});

// ===============================
// CHECKOUT
// ===============================

app.post("/api/checkout", (req, res) => {
  try {
    const { cart } = req.body;

    // 1. Comprobar carrito
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "El carrito está vacío",
      });
    }

    // 2. Calcular total
    const total = cart.reduce((sum, item) => {
      const price = Number(item.variants?.nodes?.[0]?.price?.amount);

      const quantity = Number(item.quantity);

      if (
        !Number.isFinite(price) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(`Producto inválido: ${item.title || item.id}`);
      }

      return sum + price * quantity;
    }, 0);

    // Redsys trabaja en céntimos
    const amountInCents = Math.round(total * 100);

    // Pedido de máximo 12 caracteres
    const orderId = String(Date.now()).slice(-12);

    // 3. Crear pedido interno
    const order = {
      orderId,
      amount: total.toFixed(2),
      amountInCents: String(amountInCents),
      currency: "978",
      transactionType: "0",

      items: cart.map((item) => ({
        productId: item.id,

        variantId: item.variants?.nodes?.[0]?.id,

        title: item.title,

        quantity: item.quantity,

        unitPrice: item.variants?.nodes?.[0]?.price?.amount,
      })),
    };

    // AQUÍ sí existen orderId y order
    orders.set(orderId, {
      ...order,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    // 4. Parámetros Redsys
    const redsysParameters = {
      DS_MERCHANT_AMOUNT: String(amountInCents),

      DS_MERCHANT_ORDER: orderId,

      DS_MERCHANT_MERCHANTCODE: process.env.REDSYS_MERCHANT_CODE,

      DS_MERCHANT_CURRENCY: "978",

      DS_MERCHANT_TRANSACTIONTYPE: "0",

      DS_MERCHANT_TERMINAL: process.env.REDSYS_TERMINAL,

      DS_MERCHANT_URLOK: `http://localhost:5173/?payment=ok&order=${orderId}`,

      DS_MERCHANT_URLKO: `http://localhost:5173/?payment=ko&order=${orderId}`,

      DS_MERCHANT_MERCHANTNAME: "G Store",

      DS_MERCHANT_PRODUCTDESCRIPTION: "Compra G Store",
    };

    // Solo añadimos webhook si tenemos URL pública
    if (process.env.PUBLIC_BACKEND_URL) {
      redsysParameters.DS_MERCHANT_MERCHANTURL = `${process.env.PUBLIC_BACKEND_URL}/api/redsys/notification`;
    }

    // 5. MerchantParameters
    const merchantParameters = createMerchantParameters(redsysParameters);

    // 6. Firma
    const signature = createMerchantSignature({
      secretKey: process.env.REDSYS_SECRET_KEY,

      order: orderId,

      merchantParameters,
    });

    console.log("Pedido preparado:", order);

    // 7. Respuesta para React
    return res.status(200).json({
      ok: true,

      message: "Pedido preparado correctamente",

      order,

      payment: {
        url: process.env.REDSYS_URL,

        Ds_SignatureVersion: "HMAC_SHA512_V2",

        Ds_MerchantParameters: merchantParameters,

        Ds_Signature: signature,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);

    return res.status(500).json({
      ok: false,
      message: "Error preparando el pedido",
    });
  }
});

// ===============================
// NOTIFICACIÓN REDSYS
// ===============================

app.post(
  "/api/redsys/notification",

  express.urlencoded({
    extended: false,
  }),

  (req, res) => {
    try {
      const { Ds_MerchantParameters, Ds_Signature } = req.body;

      if (!Ds_MerchantParameters || !Ds_Signature) {
        console.error("Notificación Redsys incompleta");

        return res.sendStatus(400);
      }

      // 1. Verificar firma
      const validSignature = verifyMerchantSignature({
        secretKey: process.env.REDSYS_SECRET_KEY,

        merchantParameters: Ds_MerchantParameters,

        receivedSignature: Ds_Signature,
      });

      if (!validSignature) {
        console.error("Firma Redsys inválida");

        return res.sendStatus(400);
      }

      // 2. Decodificar respuesta
      const payment = decodeMerchantParameters(Ds_MerchantParameters);

      console.log("Notificación Redsys válida:", payment);

      // 3. Comprobar resultado
      const responseCode = Number(payment.Ds_Response);

      const paymentApproved = responseCode >= 0 && responseCode <= 99;

      // 4. Buscar pedido
      const existingOrder = orders.get(payment.Ds_Order);

      if (existingOrder) {
        orders.set(payment.Ds_Order, {
          ...existingOrder,

          status: paymentApproved ? "PAID" : "REJECTED",

          redsysResponse: payment.Ds_Response,

          authorisationCode: payment.Ds_AuthorisationCode,

          updatedAt: new Date().toISOString(),
        });
      }

      if (paymentApproved) {
        console.log(`✅ PEDIDO ${payment.Ds_Order}: PAGADO`);
      } else {
        console.log(`❌ PEDIDO ${payment.Ds_Order}: RECHAZADO`);
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error("Error procesando Redsys:", error);

      return res.sendStatus(500);
    }
  },
);

// ===============================
// CONSULTAR PEDIDO
// ===============================

app.get("/api/orders/:orderId", (req, res) => {
  const order = orders.get(req.params.orderId);

  if (!order) {
    return res.status(404).json({
      ok: false,
      message: "Pedido no encontrado",
    });
  }

  return res.json({
    ok: true,
    order,
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(`G Store API running on http://localhost:${PORT}`);
});
