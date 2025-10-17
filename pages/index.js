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
                  {product.tag && <span className="product-tag">{product.tag}</span>}
                  <Image
                    src={product.product_colors[0]?.image_url || '/logo-vidaanimada.png'}
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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // LA CORRECCIÓN CLAVE ESTÁ AQUÍ
  const { data: products } = await supabase
    .from('products')
    .select(`
        *,
        product_colors (
            *,
            product_variants (*)
        )
    `)
    .eq('tag', 'Destacado')
    .filter('product_colors.product_variants.stock', 'gt', 0);

  return { props: { products: products || [] }, revalidate: 10 };
}