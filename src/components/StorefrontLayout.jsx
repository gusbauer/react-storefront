export default function StorefrontLayout({ children, cartControl }) {
  return (
    <div className="storefront">
      <div className="announcement">G STORE — ESSENTIALS FOR EVERYDAY LIFE</div>

      <header className="site-header">
        <a href="#inicio" className="brand" aria-label="G Store, inicio">
          G<span>.</span>
          <small>STORE</small>
        </a>

        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#inicio">Inicio</a>
          <a href="#productos">Colección</a>
          <a href="#nosotros">Nosotros</a>
        </nav>

        <div className="header-actions">{cartControl}</div>
      </header>

      <main>
        <section id="inicio" className="hero">
          <div className="hero-content">
            <span className="eyebrow">THE EVERYDAY COLLECTION</span>

            <h1>
              Less noise.
              <br />
              <em>More style.</em>
            </h1>

            <p>
              Diseños esenciales para cada día. Descubre una nueva forma de
              vestir lo sencillo.
            </p>

            <a href="#productos" className="btn-primary">
              Explorar colección
              <span aria-hidden="true">↗</span>
            </a>

            <span className="hero-footnote">G STORE / EST. 2026</span>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-ring" />
            <span className="art-letter">G.</span>
            <span className="art-label">THE ESSENTIAL EDIT</span>
          </div>
        </section>

        <section className="benefits" aria-label="Características de la tienda">
          <span>DISEÑO ESENCIAL</span>
          <span>ESTILO ATEMPORAL</span>
          <span>COMPRA SENCILLA</span>
        </section>

        <section id="productos" className="collection">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DISCOVER G STORE</span>
              <h2>
                La colección<span>.</span>
              </h2>
              <p>Piezas esenciales. Estilo sin complicaciones.</p>
            </div>

            <span className="collection-index">01 / COLECCIÓN</span>
          </div>

          <div className="products-content">{children}</div>
        </section>

        <section id="nosotros" className="about-banner">
          <span className="eyebrow">OUR PHILOSOPHY</span>
          <h2>Lo esencial nunca pasa de moda.</h2>
          <p>Una tienda creada para explorar nuevas experiencias de compra.</p>
          <a href="#productos">Descubrir productos ↗</a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <strong>G.</strong>
          <span>G STORE</span>
        </div>

        <p>Everyday essentials. Built with purpose.</p>
        <span>© 2026 G Store</span>
      </footer>
    </div>
  );
}
