// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function HomePage({ products }) {

  // --- FUNCIÓN HELPER ACTUALIZADA ---
  const getProductImage = (product) => {
    switch (product.product_type) {
      case 'SIMPLE':
        // Simple: usa image_url
        return product.image_url || '/logo-vidaanimada.png';
      case 'VARIANT':
        // Variant: usa la imagen de la primera variante
        return product.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
      case 'BUNDLE':
        // Bundle: En listados, usamos el fallback.
        // Mostrar imagen de componente requeriría más datos.
        return '/logo-vidaanimada.png';
      default:
        return '/logo-vidaanimada.png';
    }
  };

  return (
    <>
      <Head>
        <title>Vida Animada</title>
        <link rel="icon" href="/logo-vidaanimada.png" />
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
            {products.map((product) => (
              <Link href={`/productos/${product.id}`} key={product.id}>
                <div className="product-card" style={{ cursor: 'pointer' }}>
                  {product.tag && <span className="product-tag">{product.tag}</span>}

                  {/* --- LÍNEA DE IMAGEN CORREGIDA --- */}
                  <Image
                    src={getProductImage(product)}
                    alt={product.name}
                    width={300} height={280}
                    style={{ objectFit: 'cover' }}
                  />

                  <h4>{product.name}</h4>
                  <p className="price">Desde ${product.base_price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export async function getStaticProps() {
  const supabase = createClient( process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY );
  
  // --- CONSULTA CORREGIDA (SIN COMENTARIOS) ---
  const { data: products, error } = await supabase
    .from('products')
    .select(`
        id, name, base_price, product_type, image_url, tag, 
        product_variants (variant_image_url) 
    `)
    .eq('tag', 'Destacado'); 

  if (error) {
    console.error("Error fetching featured products:", error.message);
  }

  return { props: { products: products || [] }, revalidate: 60 };
}