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
