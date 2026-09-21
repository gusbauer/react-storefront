import { useCart } from "../context/CartContext.jsx";

function Cart({ onClose }) {
  const {
    cart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    cartTotal,
  } = useCart();

  return (
    <div className="cart-overlay">
      <div className="cart-panel">
        <div className="cart-header">
          <h2>Tu carrito</h2>

          <button onClick={onClose}>Cerrar</button>
        </div>

        {cart.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <>
            {cart.map((item) => {
              const variant = item.variants.nodes[0];

              return (
                <div key={item.id} className="cart-item">
                  <h3>{item.title}</h3>

                  <p>
                    {variant?.price.amount} {variant?.price.currencyCode}
                  </p>

                  <div className="quantity-controls">
                    <button onClick={() => decreaseQuantity(item.id)}>-</button>

                    <span>{item.quantity}</span>

                    <button onClick={() => increaseQuantity(item.id)}>+</button>
                  </div>

                  <button onClick={() => removeFromCart(item.id)}>
                    Eliminar
                  </button>
                </div>
              );
            })}

            <div className="cart-total">
              <strong>Total: {cartTotal.toFixed(2)} USD</strong>
            </div>

            <button className="checkout-button">Finalizar compra</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;
