// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
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
        <link rel="icon" href="/logo-vidaanimada.png" />
      </Head>
      <Header />
      <main>
        <section id="inicio" className="hero-section">{/* ... */}</section>
        <section id="productos" className="content-section-alt">
          <h2>Productos Destacados</h2>
          <div className="product-grid">
            {products.map((product) => (
              <Link href={`/productos/${product.id}`} key={product.id}>
                <div className="product-card" style={{ cursor: 'pointer' }}>

                  {/* --- LA LÍNEA VA AQUÍ, DENTRO DE LA TARJETA --- */}
                  {product.tag && <span className="product-tag">{product.tag}</span>}

                  <Image
                    src={product.product_variants[0]?.image_url || '/placeholder.png'}
                    alt={product.name}
                    width={300}
                    height={280}
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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  // Traemos los productos destacados CON sus variantes
  const { data: products } = await supabase
    .from('products')
    .select('*, product_variants (*)')
    .eq('is_featured', true)
    .filter('product_variants', 'gt', 'stock', 0); // Opcional: solo muestra si alguna variante tiene stock

  return { props: { products: products || [] }, revalidate: 10 };
}