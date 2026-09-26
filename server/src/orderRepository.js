import db from "./database.js";

// ===============================
// STATEMENTS PREPARADOS
// ===============================

// Insertar el pedido principal
const insertOrder = db.prepare(`
  INSERT INTO orders (
    order_id,
    amount_cents,
    currency,
    transaction_type,
    status,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Insertar cada artículo del pedido
const insertItem = db.prepare(`
  INSERT INTO order_items (
    order_id,
    product_id,
    variant_id,
    title,
    quantity,
    unit_price_cents
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Seleccionar un pedido por ID
const selectOrder = db.prepare(`
  SELECT
    order_id AS orderId,
    amount_cents AS amountInCents,
    currency,
    transaction_type AS transactionType,
    status,
    redsys_response AS redsysResponse,
    authorisation_code AS authorisationCode,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM orders
  WHERE order_id = ?
`);

// Actualizar el resultado del pago (solo si sigue PENDING)
const updateOrderPayment = db.prepare(`
  UPDATE orders
  SET
    status = ?,
    redsys_response = ?,
    authorisation_code = ?,
    updated_at = ?
  WHERE order_id = ?
    AND status = 'PENDING'
`);

// Obtener los productos de un pedido
const selectOrderItems = db.prepare(`
  SELECT
    id,
    product_id AS productId,
    variant_id AS variantId,
    title,
    quantity,
    unit_price_cents AS unitPriceCents
  FROM order_items
  WHERE order_id = ?
  ORDER BY id ASC
`);

// ===============================
// GUARDAR PEDIDO (transacción)
// ===============================

export const saveOrder = db.transaction((order) => {
  insertOrder.run(
    order.orderId,
    Number(order.amountInCents),
    order.currency,
    order.transactionType,
    "PENDING",
    new Date().toISOString(),
  );

  for (const item of order.items) {
    if (
      !item.variantId ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("Artículo del pedido inválido");
    }

    const unitPriceCents = Math.round(Number(item.unitPrice) * 100);

    if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
      throw new Error("Precio del artículo inválido");
    }

    insertItem.run(
      order.orderId,
      item.productId,
      item.variantId,
      item.title,
      item.quantity,
      unitPriceCents,
    );
  }
});

// ===============================
// BUSCAR PEDIDO
// ===============================

export function getOrder(orderId) {
  return selectOrder.get(orderId);
}

// ===============================
// ACTUALIZAR ESTADO DEL PAGO
// ===============================

export function updatePaymentStatus(
  orderId,
  status,
  responseCode,
  authorisationCode,
) {
  if (!["PAID", "REJECTED"].includes(status)) {
    throw new Error("Estado de pago inválido");
  }

  const result = updateOrderPayment.run(
    status,
    responseCode,
    authorisationCode,
    new Date().toISOString(),
    orderId,
  );

  return result.changes === 1;
}

// ===============================
// OBTENER PEDIDO + ARTÍCULOS
// ===============================

export function getOrderWithItems(orderId) {
  const order = getOrder(orderId);

  if (!order) {
    return null;
  }

  const items = selectOrderItems.all(orderId).map((item) => ({
    ...item,
    subtotalCents: item.unitPriceCents * item.quantity,
  }));

  return {
    ...order,
    items,
  };
}
export function getSalesSummary() {
  const summary = db
    .prepare(
      `
    SELECT
      COUNT(*) FILTER (
        WHERE status = 'PAID'
      ) AS paidOrders,

      COUNT(*) FILTER (
        WHERE status = 'REJECTED'
      ) AS rejectedOrders,

      COUNT(*) FILTER (
        WHERE status = 'PENDING'
      ) AS pendingOrders,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'PAID'
            THEN amount_cents
            ELSE 0
          END
        ),
        0
      ) AS revenueCents

    FROM orders
  `,
    )
    .get();

  const units = db
    .prepare(
      `
    SELECT
      COALESCE(
        SUM(oi.quantity),
        0
      ) AS unitsSold

    FROM order_items oi
    INNER JOIN orders o
      ON o.order_id = oi.order_id

    WHERE o.status = 'PAID'
  `,
    )
    .get();

  const averageTicketCents =
    summary.paidOrders > 0
      ? Math.round(summary.revenueCents / summary.paidOrders)
      : 0;

  return {
    paidOrders: summary.paidOrders,
    rejectedOrders: summary.rejectedOrders,
    pendingOrders: summary.pendingOrders,
    revenueCents: summary.revenueCents,
    unitsSold: units.unitsSold,
    averageTicketCents,
  };
}
