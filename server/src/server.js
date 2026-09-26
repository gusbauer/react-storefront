import express from "express";
import cors from "cors";
import "dotenv/config";

import { getVariantsByIds } from "./shopify.js";

import {
  saveOrder,
  getOrder,
  getOrderWithItems,
  updatePaymentStatus,
  getSalesSummary,
} from "./orderRepository.js";

import {
  createMerchantParameters,
  createMerchantSignature,
  decodeMerchantParameters,
  verifyMerchantSignature,
} from "./redsys.js";

const app = express();

const PORT = process.env.PORT || 3001;

// =====================================
// MIDDLEWARE
// =====================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

app.use(express.json());

// =====================================
// HEALTH CHECK
// =====================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "g-store-api",
    message: "Backend funcionando correctamente",
  });
});

// =====================================
// CHECKOUT
// =====================================

app.post("/api/checkout", async (req, res) => {
  try {
    const { cart } = req.body;

    // 1. Comprobar carrito
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "El carrito está vacío",
      });
    }

    // =====================================
    // 2. VALIDAR DATOS DEL CARRITO
    // =====================================

    const requestedItems = cart.map((item) => {
      const variantId = item.variants?.nodes?.[0]?.id;

      const quantity = Number(item.quantity);

      if (!variantId || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Producto inválido: ${item.title || item.id}`);
      }

      return {
        variantId,
        quantity,
      };
    });

    // =====================================
    // 3. CONSULTAR SHOPIFY
    // =====================================

    const shopifyVariants = await getVariantsByIds(
      requestedItems.map((item) => item.variantId),
    );

    const variantsById = new Map(
      shopifyVariants.map((variant) => [variant.id, variant]),
    );

    // =====================================
    // 4. CALCULAR PRECIO REAL
    // =====================================

    let amountInCents = 0;

    const verifiedItems = requestedItems.map((item) => {
      const variant = variantsById.get(item.variantId);

      if (!variant) {
        throw new Error(`Variante no encontrada en Shopify: ${item.variantId}`);
      }

      if (!variant.availableForSale) {
        throw new Error(`${variant.product.title} no está disponible`);
      }

      const { amount, currencyCode } = variant.price;

      if (currencyCode !== "EUR") {
        throw new Error(
          `Moneda no admitida: ${currencyCode}. G Store requiere EUR`,
        );
      }

      const unitPriceCents = Math.round(Number(amount) * 100);

      if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
        throw new Error(`Precio inválido para ${variant.product.title}`);
      }

      amountInCents += unitPriceCents * item.quantity;

      return {
        productId: variant.product.id,
        variantId: variant.id,
        title: variant.product.title,
        quantity: item.quantity,
        unitPrice: (unitPriceCents / 100).toFixed(2),
      };
    });

    if (amountInCents <= 0) {
      throw new Error("El importe del pedido no es válido");
    }

    const total = amountInCents / 100;

    // =====================================
    // 5. CREAR PEDIDO
    // =====================================

    const orderId = String(Date.now()).slice(-12);

    const order = {
      orderId,
      amount: total.toFixed(2),
      amountInCents: String(amountInCents),
      currency: "978",
      transactionType: "0",
      items: verifiedItems,
    };

    // =====================================
    // 6. PARÁMETROS REDSYS
    // =====================================

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

    // Webhook público
    if (process.env.PUBLIC_BACKEND_URL) {
      redsysParameters.DS_MERCHANT_MERCHANTURL = `${process.env.PUBLIC_BACKEND_URL}/api/redsys/notification`;
    }

    // =====================================
    // 7. FIRMA REDSYS
    // =====================================

    const merchantParameters = createMerchantParameters(redsysParameters);

    const signature = createMerchantSignature({
      secretKey: process.env.REDSYS_SECRET_KEY,

      order: orderId,

      merchantParameters,
    });

    // =====================================
    // 8. GUARDAR EN SQLITE
    // =====================================

    saveOrder(order);

    console.log(`Pedido ${orderId} guardado en SQLite`);

    console.log("Pedido preparado:", order);

    // =====================================
    // 9. RESPUESTA PARA REACT
    // =====================================

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
      message: error.message || "Error preparando el pedido",
    });
  }
});

// =====================================
// NOTIFICACIÓN REDSYS
// =====================================

app.post(
  "/api/redsys/notification",
  express.urlencoded({
    extended: false,
  }),

  (req, res) => {
    try {
      const { Ds_MerchantParameters, Ds_Signature } = req.body;

      // 1. Validar parámetros
      if (!Ds_MerchantParameters || !Ds_Signature) {
        console.error("Notificación Redsys incompleta");

        return res.sendStatus(400);
      }

      // =====================================
      // 2. VERIFICAR FIRMA
      // =====================================

      const validSignature = verifyMerchantSignature({
        secretKey: process.env.REDSYS_SECRET_KEY,

        merchantParameters: Ds_MerchantParameters,

        receivedSignature: Ds_Signature,
      });

      if (!validSignature) {
        console.error("Firma Redsys inválida");

        return res.sendStatus(400);
      }

      // =====================================
      // 3. DECODIFICAR RESPUESTA
      // =====================================

      const payment = decodeMerchantParameters(Ds_MerchantParameters);

      console.log("Notificación Redsys válida:", payment);

      // =====================================
      // 4. BUSCAR PEDIDO EN SQLITE
      // =====================================

      const existingOrder = getOrder(payment.Ds_Order);

      if (!existingOrder) {
        console.error("Pedido desconocido:", payment.Ds_Order);

        return res.sendStatus(400);
      }

      // =====================================
      // 5. VALIDAR DATOS
      // =====================================

      const matches =
        String(payment.Ds_Amount) === String(existingOrder.amountInCents) &&
        String(payment.Ds_Currency) === existingOrder.currency &&
        String(payment.Ds_MerchantCode) === process.env.REDSYS_MERCHANT_CODE &&
        String(payment.Ds_Terminal) === process.env.REDSYS_TERMINAL &&
        String(payment.Ds_TransactionType) === existingOrder.transactionType;

      if (!matches) {
        console.error("Los datos no coinciden con el pedido");

        return res.sendStatus(400);
      }

      // =====================================
      // 6. EVITAR DUPLICADOS
      // =====================================

      if (existingOrder.status !== "PENDING") {
        console.log(
          "Pedido ya procesado:",
          payment.Ds_Order,
          existingOrder.status,
        );

        return res.sendStatus(200);
      }

      // =====================================
      // 7. COMPROBAR RESULTADO REDSYS
      // =====================================

      const responseCode = String(payment.Ds_Response ?? "");

      if (!/^\d{4}$/.test(responseCode)) {
        console.error("Código de respuesta inválido");

        return res.sendStatus(400);
      }

      const paymentApproved =
        Number(responseCode) >= 0 && Number(responseCode) <= 99;

      const newStatus = paymentApproved ? "PAID" : "REJECTED";

      // =====================================
      // 8. ACTUALIZAR SQLITE
      // =====================================

      const updated = updatePaymentStatus(
        payment.Ds_Order,
        newStatus,
        responseCode,
        payment.Ds_AuthorisationCode ?? null,
      );

      if (!updated) {
        console.error("El pedido ya no está pendiente:", payment.Ds_Order);

        return res.sendStatus(200);
      }

      console.log(`PEDIDO ${payment.Ds_Order}: ${newStatus} (SQLite)`);

      return res.sendStatus(200);
    } catch (error) {
      console.error("Error procesando Redsys:", error);

      return res.sendStatus(500);
    }
  },
);

// =====================================
// CONSULTAR PEDIDO Y PRODUCTOS
// =====================================

app.get("/api/orders/:orderId", (req, res) => {
  const order = getOrderWithItems(req.params.orderId);

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

// =====================================
// ANALYTICS SUMMARY
// =====================================

app.get("/api/analytics/summary", (req, res) => {
  try {
    const summary = getSalesSummary();

    return res.json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo el resumen de ventas",
    });
  }
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
  console.log(`G Store API running on http://localhost:${PORT}`);
});
