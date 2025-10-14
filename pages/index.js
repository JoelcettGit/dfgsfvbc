// pages/index.js
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { useCart } from '../context/CartContext';
import Header from '../components/Header'; // Importa el Header
import Footer from '../components/Footer'; // Importa el Footer

export default function HomePage({ products }) {
  const { addToCart } = useCart();

  return (
    <>
      <Head>
        <title>Vida Animada</title>
      </Head>

      <Header /> {/* Usa el componente Header */}

      <main>
        <section id="inicio" className="hero-section">
            <div className="hero-content">
                <h1>Animamos tus días con pequeños detalles</h1>
                <p>Descubre un mundo de color y alegría para ti y tu familia.</p>
                <a href="/categorias" className="btn-primary">Ver Productos</a>
            </div>
        </section>

        <section id="productos" className="content-section-alt">
          <h2>Productos Destacados</h2>
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <img src={product.image_url} alt={product.name} />
                <h4>{product.name}</h4>
                <p className="price">${product.price}</p>
                <div className="product-card-actions">
                  <a href={`https://wa.me/3804882298?text=Hola!%20Me%20interesa%20el%20producto:%20${product.name}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    ¡Lo quiero!
                  </a>
                  <button onClick={() => addToCart(product)} className="btn-primary">
                    Agregar al Carrito
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Aquí puedes añadir la sección "Nosotros" si la necesitas en esta página */}

      </main>

      <Footer /> {/* Usa el componente Footer */}
    </>
  );
}

// Esta es la única vez que se define
export async function getStaticProps() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_featured', true);

  return {
    props: { products: products || [] },
    revalidate: 10,
  };
}