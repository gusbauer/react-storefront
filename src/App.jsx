import { useEffect, useState } from "react";

import { getProducts } from "./lib/shopify";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import StorefrontLayout from "./components/StorefrontLayout";

import { useCart } from "./context/CartContext";

import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { cartQuantity } = useCart();

  // Leer el resultado de retorno de Redsys.
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  const returnedOrderId = params.get("order");

  // Cargar los productos desde Shopify.
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Error cargando Shopify:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Botón que aparecerá en la nueva cabecera.
  const cartButton = (
    <button
      type="button"
      className="header-cart-button"
      onClick={() => setIsCartOpen(true)}
      aria-label={`Abrir carrito, ${cartQuantity} productos`}
    >
      <span aria-hidden="true">🛍</span>
      <span>Carrito</span>
      <span className="cart-count">{cartQuantity}</span>
    </button>
  );

  return (
    <>
      <StorefrontLayout cartControl={cartButton}>
        {/* Mensajes al volver del TPV de Redsys */}
        {paymentStatus === "ok" && (
          <div className="payment-message payment-success" role="status">
            <strong>Has vuelto de la pasarela de pago.</strong>
            <p>
              Consultando la confirmación del pedido {returnedOrderId || ""}.
            </p>
            <small>
              La confirmación definitiva depende de la notificación verificada
              por nuestro servidor.
            </small>
          </div>
        )}

        {paymentStatus === "ko" && (
          <div className="payment-message payment-error" role="alert">
            <strong>El pago no se ha completado.</strong>
            <p>Puedes volver a intentarlo desde tu carrito.</p>
          </div>
        )}

        {/* Estados de carga y error */}
        {loading && (
          <div className="store-notice" role="status">
            Cargando nuestra colección...
          </div>
        )}

        {error && (
          <div className="store-notice store-notice-error">
            <h3>No se han podido cargar los productos.</h3>
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}

        {/* Productos procedentes de Shopify */}
        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <div className="store-notice">
                Todavía no hay productos disponibles.
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </StorefrontLayout>

      {/* Mantener el carrito fuera del layout */}
      {isCartOpen && <Cart onClose={() => setIsCartOpen(false)} />}
    </>
  );
}

export default App;
