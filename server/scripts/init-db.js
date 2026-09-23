import db from "../src/database.js";

const tables = db
  .prepare(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('orders', 'order_items')
    ORDER BY name
  `,
  )
  .all();

console.log("Base de datos G Store inicializada");
console.log(
  "Tablas creadas:",
  tables.map((table) => table.name),
);

db.close();
