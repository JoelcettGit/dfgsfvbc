// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function HomePage({ products }) {
  const { addToCart } = useCart();

  return (
    <>
      <Head>
        <title>Vida Animada</title>
        <link rel="icon" href="/logo-vidaanimada.png"/>
      </Head>
      <Header />
      <main>
        <section id="inicio" className="hero-section">
            <div className="hero-content">
                <h1>Animamos tus días con pequeños detalles</h1>
                <p>Descubre un mundo de color y alegría para ti y tu familia.</p>
                <a href="#productos" className="btn-primary">Ver Productos</a>
            </div>
        </section>
        <section id="productos" className="content-section-alt">
          <h2>Productos Destacados</h2>
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <Image src={product.image_url} alt={product.name} width={300} height={280} style={{ objectFit: 'cover' }}/>
                <h4>{product.name}</h4>
                <p className="price">${product.price}</p>
                <div className="product-card-actions">
                  <a href={`https://wa.me/3804882298?text=Hola!%20Me%20interesa%20el%20producto:%20${encodeURIComponent(product.name)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
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
        <section id="nosotros" className="content-section">
            <h2>Nuestra Historia</h2>
            {/* Aquí puedes añadir el contenido de la sección "Nosotros" */}
        </section>
      </main>
      <Footer />
    </>
  );
}

export async function getStaticProps() {
  const supabase = createClient( process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY );
  const { data: products } = await supabase.from('products').select('*').eq('is_featured', true);
  return { props: { products: products || [] }, revalidate: 10 };
}
