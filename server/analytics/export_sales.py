import sqlite3
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "data" / "gstore.db"
EXPORT_DIR = BASE_DIR / "analytics" / "exports"

EXPORT_DIR.mkdir(parents=True, exist_ok=True)


def load_orders():
    connection = sqlite3.connect(DATABASE_PATH)

    query = """
        SELECT
            o.order_id,
            o.status,
            o.amount_cents,
            o.currency,
            o.created_at,
            o.updated_at,
            oi.product_id,
            oi.variant_id,
            oi.title AS product_name,
            oi.quantity,
            oi.unit_price_cents
        FROM orders o
        INNER JOIN order_items oi
            ON oi.order_id = o.order_id
        ORDER BY o.created_at ASC
    """

    dataframe = pd.read_sql_query(
        query,
        connection
    )

    connection.close()

    return dataframe


def transform_sales(dataframe):
    dataframe["amount_eur"] = (
        dataframe["amount_cents"] / 100
    )

    dataframe["unit_price_eur"] = (
        dataframe["unit_price_cents"] / 100
    )

    dataframe["line_revenue_eur"] = (
        dataframe["quantity"]
        * dataframe["unit_price_eur"]
    )

    dataframe["created_at"] = (
    pd.to_datetime(
        dataframe["created_at"],
        utc=True
    )
    .dt.tz_localize(None)
)
    dataframe["updated_at"] = (
    pd.to_datetime(
        dataframe["updated_at"],
        utc=True,
        errors="coerce"
    )
    .dt.tz_localize(None)
)

    dataframe["date"] = (
        dataframe["created_at"].dt.date
    )

    return dataframe


def export_sales(dataframe):
    csv_path = EXPORT_DIR / "sales.csv"
    excel_path = EXPORT_DIR / "sales.xlsx"

    dataframe.to_csv(
        csv_path,
        index=False,
        encoding="utf-8-sig"
    )

    dataframe.to_excel(
        excel_path,
        index=False,
        sheet_name="Sales"
    )

    return csv_path, excel_path


def main():
    sales = load_orders()

    if sales.empty:
        print("No hay pedidos para exportar.")
        return

    sales = transform_sales(sales)

    csv_path, excel_path = export_sales(sales)

    print("\nDatos exportados correctamente.")
    print(f"CSV: {csv_path}")
    print(f"Excel: {excel_path}")

    print("\nVista previa:")
    print(
        sales[
            [
                "order_id",
                "status",
                "product_name",
                "quantity",
                "unit_price_eur",
                "line_revenue_eur",
                "date",
            ]
        ].head()
    )


if __name__ == "__main__":
    main()