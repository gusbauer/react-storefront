import { useCart } from "../context/CartContext.jsx";

// Formatear el precio utilizando la moneda real de Shopify.
function formatPrice(price) {
  if (!price) return "Precio no disponible";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: price.currencyCode,
  }).format(Number(price.amount));
}

function ProductCard({ product }) {
  const { addToCart } = useCart();

  const variant = product.variants?.nodes?.[0];

  const price = variant?.price;

  const isAvailable = product.availableForSale && Boolean(variant);

  // Primera imagen del producto, si Shopify la proporciona.
  const image = product.images?.nodes?.[0];

  return (
    <article className="product-card">
      {/* Imagen del producto */}
      <div className="product-image">
        {image?.url ? (
          <img
            src={image.url}
            alt={image.altText || product.title}
            loading="lazy"
          />
        ) : (
          <div className="product-image-placeholder">
            <span>G.</span>
          </div>
        )}

        <span
          className={
            isAvailable
              ? "product-badge"
              : "product-badge product-badge-soldout"
          }
        >
          {isAvailable ? "DISPONIBLE" : "AGOTADO"}
        </span>
      </div>

      {/* Información */}
      <div className="product-info">
        <span className="product-category">G STORE / ESSENTIALS</span>

        <h3>{product.title}</h3>

        <p className="product-price">{formatPrice(price)}</p>

        <button
          type="button"
          className="add-to-cart-button"
          disabled={!isAvailable}
          onClick={() => addToCart(product)}
        >
          {isAvailable ? "Añadir al carrito ↗" : "Agotado"}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
