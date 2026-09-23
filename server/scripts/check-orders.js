import db from "../src/database.js";

const orders = db
  .prepare(
    `
  SELECT
    o.order_id,
    o.amount_cents,
    o.currency,
    o.status,
    o.created_at,
    COUNT(i.id) AS item_count
  FROM orders o
  LEFT JOIN order_items i
    ON i.order_id = o.order_id
  GROUP BY o.order_id
  ORDER BY o.created_at DESC
  LIMIT 10
`,
  )
  .all();

console.table(orders);

db.close();
