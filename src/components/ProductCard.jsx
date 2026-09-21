import { useCart } from "../context/CartContext.jsx";

function ProductCard({ product }) {
  const { addToCart } = useCart();

  const variant = product.variants.nodes[0];

  return (
    <article className="product-card">
      <h3>{product.title}</h3>

      <p className="price">
        {variant?.price.amount} {variant?.price.currencyCode}
      </p>

      <p>{product.availableForSale ? "Disponible" : "Agotado"}</p>

      <button
        disabled={!product.availableForSale}
        onClick={() => addToCart(product)}
      >
        Añadir al carrito
      </button>
    </article>
  );
}

export default ProductCard;
