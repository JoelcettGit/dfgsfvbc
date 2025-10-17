// pages/productos/[id].js
import Head from 'next/head';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage({ product }) {
    const { addToCart } = useCart();

    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);

    const availableColors = useMemo(() => product.product_colors || [], [product.product_colors]);

    const availableSizes = useMemo(() => {
        const color = availableColors.find(c => c.id === selectedColor?.id);
        return color?.product_variants || [];
    }, [selectedColor, availableColors]);

    useEffect(() => {
        if (availableColors.length > 0 && !selectedColor) {
            setSelectedColor(availableColors[0]);
        }
    }, [availableColors, selectedColor]);

    useEffect(() => {
        if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0]);
        } else {
            setSelectedSize(null);
        }
    }, [selectedColor, availableSizes]);

    const currentVariant = useMemo(() => {
        return availableSizes.find(v => v.id === selectedSize?.id);
    }, [selectedSize, availableSizes]);

    const handleAddToCart = () => {
        if (selectedColor && currentVariant && currentVariant.stock > 0) {
            addToCart({
                id: currentVariant.id,
                name: product.name,
                price: product.base_price,
                image_url: selectedColor.image_url,
                color_name: selectedColor.color_name,
                size: currentVariant.size
            });
            alert(`${product.name} (${selectedColor.color_name} / ${currentVariant.size}) fue agregado al carrito!`);
        } else {
            alert("Selección no disponible o sin stock.");
        }
    };

    if (!product) return <div>Cargando...</div>;

    return (
        <>
            <Head><title>{product.name} - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <div className="product-detail-layout">
                        <div className="product-image-section">
                            <Image
                                src={selectedColor?.image_url || '/logo-vidaanimada.png'}
                                alt={product.name}
                                width={500} height={500}
                                style={{ objectFit: 'cover', borderRadius: '15px' }}
                                key={selectedColor?.id}
                            />
                        </div>
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>

                            {availableColors.length > 0 && (
                                <div className="variant-selector">
                                    <label>Color: <b>{selectedColor?.color_name}</b></label>
                                    <div className="color-swatch-list">
                                        {availableColors.map(color => (
                                            <button key={color.id}
                                                className={`color-swatch ${selectedColor?.id === color.id ? 'active' : ''}`}
                                                style={{ backgroundColor: color.color_hex || '#ccc' }}
                                                onClick={() => setSelectedColor(color)}
                                                title={color.color_name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {availableSizes.length > 0 && (
                                <div className="variant-selector">
                                    <label>Talle:</label>
                                    <div className="size-button-list">
                                        {availableSizes.map(variant => (
                                            <button key={variant.id}
                                                className={`size-button ${selectedSize?.id === variant.id ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(variant)}
                                            >
                                                {variant.size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="stock-info">
                                {currentVariant?.stock > 0 ? `${currentVariant.stock} unidades disponibles` : 'Sin stock'}
                            </div>
                            <button onClick={handleAddToCart} className="btn-primary add-to-cart-btn" disabled={!currentVariant || currentVariant.stock === 0}>
                                Agregar al Carrito
                            </button>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

export async function getStaticPaths() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: products } = await supabase.from('products').select('id');
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // LA CORRECCIÓN CLAVE ESTÁ AQUÍ
    const { data: product } = await supabase
        .from('products')
        .select(`
            *,
            product_colors (
                *,
                product_variants (*)
            )
        `)
        .eq('id', params.id)
        .single();

    return { props: { product }, revalidate: 10 };
}