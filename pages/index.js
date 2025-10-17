// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function HomePage({ products }) {
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
                <Link href="/categorias" className="btn-primary">
                  Ver Productos
                </Link>
            </div>
        </section>
        <section id="productos" className="content-section-alt">
          <h2>Productos Destacados</h2>
          <div className="product-grid">
            {/* Verifica si hay productos antes de mapear */}
            {products && products.length > 0 ? (
              products.map((product) => (
                <Link href={`/productos/${product.id}`} key={product.id}>
                  <div className="product-card" style={{ cursor: 'pointer' }}>
                    {product.tag && <span className="product-tag">{product.tag}</span>}
                    {/* Asegúrate de que accedemos a product_colors */}
                    <Image
                      src={product.product_colors?.[0]?.image_url || '/logo-vidaanimada.png'}
                      alt={product.name}
                      width={300} height={280}
                      style={{ objectFit: 'cover' }}
                      onError={(e) => { e.target.src = '/logo-vidaanimada.png'; }} // Fallback por si la URL es inválida
                    />
                    <h4>{product.name}</h4>
                    <p className="price">Desde ${product.base_price}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p>No hay productos destacados en este momento.</p> // Mensaje si no hay productos
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// Asegúrate de que esta función sea exactamente así
export async function getStaticProps() {
  const supabase = createClient( process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY );

  const { data: products, error } = await supabase
    .from('products')
    .select('*, product_colors(*, product_variants(*))') // Consulta anidada correcta
    .eq('tag', 'Destacado') // Busca por la etiqueta exacta
    // Opcional: filtro de stock - asegúrate que al menos una variante tenga stock
    // .filter('product_colors.product_variants.stock', 'gt', 0); 
  
  if (error) {
    console.error("Error fetching featured products:", error);
  }

  return { props: { products: products || [] }, revalidate: 10 };
}