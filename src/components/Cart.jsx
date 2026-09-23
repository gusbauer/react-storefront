import { useCart } from "../context/CartContext.jsx";
import { useState } from "react";

function Cart({ onClose }) {
  const {
    cart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    cartTotal,
  } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  async function handleCheckout() {
    try {
      setIsCheckingOut(true);

      const response = await fetch("http://localhost:3001/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
        }),
      });

      const text = await response.text();

      console.log("HTTP checkout:", response.status);
      console.log("Respuesta backend:", text);

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`El backend no devolvió JSON: ${text}`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}`);
      }

      if (!data.payment) {
        throw new Error(
          "El backend respondió correctamente, pero no devolvió payment",
        );
      }

      console.log("Pago preparado:", data.payment);

      redirectToRedsys(data.payment);
    } catch (error) {
      console.error("Checkout error completo:", error);

      alert(`No se pudo iniciar el pago:\n${error.message}`);

      setIsCheckingOut(false);
    }
  }
  function redirectToRedsys(payment) {
    console.log("Redirigiendo a:", payment.url);

    if (
      !payment.url ||
      !payment.Ds_SignatureVersion ||
      !payment.Ds_MerchantParameters ||
      !payment.Ds_Signature
    ) {
      throw new Error("Faltan datos necesarios para enviar el pago a Redsys");
    }

    const form = document.createElement("form");

    form.method = "POST";
    form.action = payment.url;

    const fields = {
      Ds_SignatureVersion: payment.Ds_SignatureVersion,

      Ds_MerchantParameters: payment.Ds_MerchantParameters,

      Ds_Signature: payment.Ds_Signature,
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");

      input.type = "hidden";
      input.name = name;
      input.value = value;

      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }
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

            <button
              className="checkout-button"
              onClick={handleCheckout}
              disabled={isCheckingOut || cart.length === 0}
            >
              {isCheckingOut ? "Redirigiendo..." : "Finalizar compra"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;
