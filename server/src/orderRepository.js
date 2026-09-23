import db from "./database.js";

// Insertar el pedido principal.
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

// Insertar cada artículo del pedido.
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

// Una transacción: se guardan todas las filas
// correctamente o no se guarda ninguna.
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
// Buscar un pedido por su identificador.
export function getOrder(orderId) {
  return db
    .prepare(
      `
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
  `,
    )
    .get(orderId);
}

// Actualizar el resultado del pago.
// Solo cambiamos pedidos que siguen PENDING.
export function updatePaymentStatus(
  orderId,
  status,
  responseCode,
  authorisationCode,
) {
  if (!["PAID", "REJECTED"].includes(status)) {
    throw new Error("Estado de pago inválido");
  }

  const result = db
    .prepare(
      `
    UPDATE orders
    SET
      status = ?,
      redsys_response = ?,
      authorisation_code = ?,
      updated_at = ?
    WHERE order_id = ?
      AND status = 'PENDING'
  `,
    )
    .run(
      status,
      responseCode,
      authorisationCode,
      new Date().toISOString(),
      orderId,
    );

  return result.changes === 1;
}
// Buscar un pedido por su identificador.
export function getOrder(orderId) {
  return db
    .prepare(
      `
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
  `,
    )
    .get(orderId);
}

// Actualizar el resultado del pago.
// Solo cambiamos pedidos que siguen PENDING.
export function updatePaymentStatus(
  orderId,
  status,
  responseCode,
  authorisationCode,
) {
  if (!["PAID", "REJECTED"].includes(status)) {
    throw new Error("Estado de pago inválido");
  }

  const result = db
    .prepare(
      `
    UPDATE orders
    SET
      status = ?,
      redsys_response = ?,
      authorisation_code = ?,
      updated_at = ?
    WHERE order_id = ?
      AND status = 'PENDING'
  `,
    )
    .run(
      status,
      responseCode,
      authorisationCode,
      new Date().toISOString(),
      orderId,
    );

  return result.changes === 1;
}
