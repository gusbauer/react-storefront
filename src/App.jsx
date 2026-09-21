import { useEffect, useState } from "react";
import { getProducts } from "./lib/shopify";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import { useCart } from "./context/CartContext";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartQuantity } = useCart();

  useEffect(() => {
    async function loadProducts() {
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

    loadProducts();
  }, []);

  if (loading) return <h2>Cargando productos...</h2>;

  if (error) {
    return (
      <div>
        <h1>Error al cargar productos</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <h1>G Store</h1>
        <nav>
          <a href="#">Inicio</a>
          <a href="#productos">Productos</a>
          <button onClick={() => setIsCartOpen(true)}>
            Carrito ({cartQuantity})
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h2>React Storefront</h2>
          <p>E-Commerce Headless conectado con Shopify</p>
        </section>

        <section id="productos">
          <h2>Productos</h2>
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>

      {isCartOpen && <Cart onClose={() => setIsCartOpen(false)} />}
    </>
  );
}

export default App;
