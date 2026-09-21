import { useEffect, useState } from "react";
import { getProducts } from "./lib/shopify";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarProductos() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    cargarProductos();
  }, []);

  if (loading) {
    return <h2>Cargando productos...</h2>;
  }

  if (error) {
    return (
      <div>
        <h1>Error al cargar productos</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main>
      <h1>React Storefront</h1>
      <p>E-Commerce Headless conectado con Shopify</p>

      <h2>Productos</h2>

      {products.map((product) => {
        const variant = product.variants.nodes[0];

        return (
          <div key={product.id}>
            <h3>{product.title}</h3>

            <p>
              Precio: {variant?.price.amount} {variant?.price.currencyCode}
            </p>

            <p>Disponible: {product.availableForSale ? "Sí" : "No"}</p>
          </div>
        );
      })}
    </main>
  );
}

export default App;
