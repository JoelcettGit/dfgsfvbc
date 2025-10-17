// pages/productos/[id].js
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react'; // useRef añadido
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// Cliente Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- Componente Principal de la Página de Producto ---
export default function ProductPage({ product, recommendedProducts }) {
    // Hook del carrito
    const { addToCart } = useCart();

    // --- Estados del Componente ---
    const [selectedColor, setSelectedColor] = useState(null); // Para VARIANT
    const [selectedVariant, setSelectedVariant] = useState(null); // Para VARIANT
    const [selectedBundleVariants, setSelectedBundleVariants] = useState({}); // Para BUNDLE
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // Para Galería

    // --- Lógica Derivada (Optimizada con useMemo) ---

    // Colores únicos disponibles (solo para 'VARIANT')
    const availableColors = useMemo(() => {
        if (product.product_type !== 'VARIANT' || !product.product_variants) return [];
        const colors = new Map();
        product.product_variants.forEach(variant => {
            if (variant.color_name && !colors.has(variant.color_name)) {
                colors.set(variant.color_name, {
                    color_name: variant.color_name,
                    color_hex: variant.color_hex,
                    image_url: variant.variant_image_url || '/logo-vidaanimada.png'
                });
            }
        });
        return Array.from(colors.values());
    }, [product]);

    // Variantes (talles) disponibles para el color seleccionado (solo para 'VARIANT')
    const variantsForSelectedColor = useMemo(() => {
        if (product.product_type !== 'VARIANT' || !selectedColor || !product.product_variants) return [];
        return product.product_variants.filter(
            variant => variant.color_name === selectedColor.color_name
        );
    }, [product, selectedColor]);

    // Stock disponible para el BUNDLE
    const bundleStock = useMemo(() => {
        if (product.product_type !== 'BUNDLE') return 0;
        let minStock = Infinity;
        let allSelected = true;
        if (!product.bundle_links || product.bundle_links.length === 0) return 0;
        if (Object.keys(selectedBundleVariants).length !== product.bundle_links.length) { allSelected = false; }
        product.bundle_links.forEach(link => {
            const selectedVariantId = selectedBundleVariants[link.id];
            if (!selectedVariantId) { allSelected = false; return; }
            const variant = link.product_variants_options?.find(v => v.id === selectedVariantId);
            if (variant && variant.stock < minStock) { minStock = variant.stock; }
            else if (!variant) { allSelected = false; }
            else if (variant && variant.stock <= 0) { minStock = 0; } // Usa <= 0 por seguridad
        });
        if (!allSelected || minStock === Infinity || minStock < 0) return 0;
        return minStock;
    }, [product, selectedBundleVariants]);

    // Lista de imágenes para la galería
    const displayImages = useMemo(() => {
        if (!product) return [{ url: '/logo-vidaanimada.png', alt: 'Cargando...' }];
        switch (product.product_type) {
            case 'SIMPLE':
                return [{ url: product.image_url || '/logo-vidaanimada.png', alt: product.name }];
            case 'VARIANT':
                const variantImageUrl = selectedColor?.image_url || product.product_variants?.[0]?.variant_image_url;
                return [{ url: variantImageUrl || '/logo-vidaanimada.png', alt: `${product.name} ${selectedColor?.color_name || ''}` }];
            case 'BUNDLE':
                if (!product.bundle_links || product.bundle_links.length === 0) { return [{ url: '/logo-vidaanimada.png', alt: product.name }]; }

                const bundleImages = product.bundle_links.map(link => {
                    // 1. Priorizamos la imagen principal del PRODUCTO COMPONENTE (Remera o Short).
                    const imageUrl = link.component_product?.image_url;

                    // 2. Si esa es nula, usamos la imagen de la primera variante como respaldo (como ya hacías).
                    const fallbackImageUrl = link.product_variants_options?.[0]?.variant_image_url;

                    const finalImageUrl = imageUrl || fallbackImageUrl || '/logo-vidaanimada.png';
                    const altText = link.component_product?.name || 'Componente';

                    return { url: finalImageUrl, alt: altText };
                }).filter(img => img.url);
                const uniqueImages = Array.from(new Map(bundleImages.map(img => [img.url, img])).values());
                const finalBundleImages = bundleImages.filter(img => img.url);
                // Si la imagen del BUNDLE padre existe y es diferente, la agregamos al inicio.
                if (product.image_url && product.image_url !== '/logo-vidaanimada.png' && !finalBundleImages.find(img => img.url === product.image_url)) {
                    finalBundleImages.unshift({ url: product.image_url, alt: product.name });
                }
                // Ahora la lista tiene 2 elementos, sin desduplicar, forzando la galería de 3 columnas.
                return finalBundleImages.length > 0 ? finalBundleImages : [{ url: '/logo-vidaanimada.png', alt: product.name }];
            default:
                return [{ url: '/logo-vidaanimada.png', alt: 'Producto' }];
        }
    }, [product, selectedColor]); // Dependencia clave: product y selectedColor

    // --- Efectos Laterales ---

    // Setear valores por defecto al cargar/cambiar producto
    useEffect(() => {
        if (product.product_type === 'VARIANT' && availableColors.length > 0 && !selectedColor) { setSelectedColor(availableColors[0]); }
        if (product.product_type === 'BUNDLE' && product.bundle_links) {
            const initialSelections = {}; let possible = true;
            product.bundle_links.forEach(link => {
                const firstAvailableVariant = link.product_variants_options?.find(v => v.stock > 0);
                if (firstAvailableVariant) { initialSelections[link.id] = firstAvailableVariant.id; } else { possible = false; }
            });
            if (possible && Object.keys(initialSelections).length === product.bundle_links.length) { setSelectedBundleVariants(initialSelections); }
        }
        return () => { setSelectedColor(null); setSelectedVariant(null); setSelectedBundleVariants({}); setCurrentImageIndex(0); };
    }, [product, availableColors]);

    // Setear talle por defecto para VARIANT cuando cambia el color
    useEffect(() => {
        if (product.product_type === 'VARIANT' && selectedColor && variantsForSelectedColor.length > 0) {
            const firstAvailable = variantsForSelectedColor.find(v => v.stock > 0);
            setSelectedVariant(firstAvailable || variantsForSelectedColor[0]);
        } else if (product.product_type === 'VARIANT') { setSelectedVariant(null); }
    }, [product.product_type, selectedColor, variantsForSelectedColor]);

// --- ¡EFECTO AJUSTADO PARA RESETEAR ÍNDICE! ---
    const prevDisplayImagesRef = useRef();
    useEffect(() => {
        const currentImagesString = JSON.stringify(displayImages);
        const prevImagesString = JSON.stringify(prevDisplayImagesRef.current);
        if (currentImagesString !== prevImagesString) {
            setCurrentImageIndex(0);
            prevDisplayImagesRef.current = displayImages;
        }
        // Añadimos selectedColor porque displayImages depende de él
    }, [displayImages, selectedColor]);

    // --- Manejador AddToCart ---
    const handleAddToCart = () => {
        switch (product.product_type) {
            case 'SIMPLE':
                if (product.stock > 0) {
                    addToCart({ id: product.id, name: product.name, price: product.base_price, image_url: product.image_url, type: 'SIMPLE' });
                    alert(`${product.name} agregado!`);
                } else { alert("Sin stock."); }
                break;
            case 'VARIANT':
                if (selectedVariant && selectedVariant.stock > 0) {
                    addToCart({ id: selectedVariant.id, name: product.name, price: product.base_price, image_url: selectedVariant.variant_image_url || selectedColor?.image_url || '/logo-vidaanimada.png', color_name: selectedColor?.color_name, size: selectedVariant.size, type: 'VARIANT' });
                    alert(`${product.name} (${selectedColor?.color_name || ''}/${selectedVariant.size || ''}) agregado!`);
                } else { alert("Selección sin stock."); }
                break;
            case 'BUNDLE':
                if (bundleStock > 0 && Object.keys(selectedBundleVariants).length === product.bundle_links.length) {
                    const componentVariantIds = Object.values(selectedBundleVariants);
                    const componentsDetails = product.bundle_links.map(link => {
                        const variantId = selectedBundleVariants[link.id];
                        const variant = link.product_variants_options?.find(v => v.id === variantId);
                        return { componentName: link.component_product?.name || 'Pieza', variantName: `${variant?.color_name || ''} / ${variant?.size || ''}`, image_url: variant?.variant_image_url || link.component_product?.image_url || '/logo-vidaanimada.png' };
                    });
                    addToCart({ id: product.id, name: product.name, price: product.base_price, image_url: componentsDetails[0]?.image_url || '/logo-vidaanimada.png', type: 'BUNDLE', componentVariantIds: componentVariantIds, componentsDetails: componentsDetails });
                    alert(`${product.name} agregado!`);
                } else {
                    if (Object.keys(selectedBundleVariants).length !== product.bundle_links.length) { alert("Por favor, selecciona una opción para cada parte del conjunto."); }
                    else { alert("Conjunto no disponible en esta combinación de tallas o sin stock."); }
                }
                break;
            default: alert("Tipo desconocido.");
        }
    };

    // --- Renderizado ---
    if (!product) return <div className="loading-screen">Cargando...</div>; // Asegúrate de tener este estilo o usa un texto simple

    // Variables de ayuda para renderizado
    const isAddToCartDisabled =
        (product.product_type === 'SIMPLE' && product.stock <= 0) ||
        (product.product_type === 'VARIANT' && (!selectedVariant || selectedVariant.stock <= 0)) ||
        (product.product_type === 'BUNDLE' && (bundleStock <= 0 || Object.keys(selectedBundleVariants).length !== product.bundle_links?.length));

    const getRecommendedImage = (recProduct) => {
        switch (recProduct.product_type) {
            case 'SIMPLE': return recProduct.image_url || '/logo-vidaanimada.png';
            case 'VARIANT': return recProduct.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
            case 'BUNDLE': return recProduct.bundle_links?.[0]?.product_variants?.variant_image_url || '/logo-vidaanimada.png';
            default: return '/logo-vidaanimada.png';
        }
    };
    const mainImageUrl = displayImages[currentImageIndex]?.url || '/logo-vidaanimada.png';
    const singleImageLayout = displayImages.length <= 1;
    const mainImageAlt = displayImages[currentImageIndex]?.alt || product.name;

    return (
        <>
            <Head>
                <title>{product.name} - Vida Animada</title>
                <link rel="icon" href="/logo-vidaanimada.png" />
            </Head>
            <Header />
            <main>
                {/* --- Sección Principal del Producto --- */}
                <section className="page-section">
                    <div className="product-detail-layout-gallery">

                        {/* Columna de Miniaturas (solo si hay > 1 imagen) */}
                        {!singleImageLayout && (
                            <div className="product-thumbnails">
                                {displayImages.map((image, index) => (
                                    <button
                                        key={index}
                                        className={`thumbnail-item ${index === currentImageIndex ? 'active' : ''}`}
                                        onClick={() => setCurrentImageIndex(index)}
                                        aria-label={`Ver imagen ${index + 1} de ${displayImages.length}`}
                                    >
                                        <Image
                                            src={image.url} alt={`Miniatura ${image.alt}`}
                                            width={80} height={80}
                                            style={{ objectFit: 'cover', display: 'block' }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Columna Imagen Principal */}
                        <div className="product-main-image" style={singleImageLayout ? { gridColumn: '1 / -1', justifySelf: 'center', maxWidth: '600px' } : {}}>
                            <Image
                                src={mainImageUrl} alt={mainImageAlt}
                                width={600} height={600} // Dimensiones base
                                priority={true} // Carga prioritaria
                                style={{
                                    objectFit: 'contain', // Mostrar imagen completa
                                    width: '100%',
                                    height: 'auto', // Mantener proporción
                                    borderRadius: '15px', // Bordes redondeados
                                    display: 'block' // Evitar espacio extra debajo
                                }}
                                key={mainImageUrl} // Refrescar si URL cambia
                            />
                        </div>

                        {/* Columna de Información */}
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>

                            {/* --- Renderizado Condicional de Selectores --- */}

                            {/* CASO: VARIANT */}
                            {product.product_type === 'VARIANT' && (
                                <>
                                    {/* Selector Color */}
                                    {availableColors.length > 0 && (
                                        <div className="variant-selector">
                                            <label>Color: <b>{selectedColor?.color_name || 'Selecciona'}</b></label>
                                            <div className="color-swatch-list">
                                                {availableColors.map(color => (
                                                    <button key={color.color_name}
                                                        className={`color-swatch ${selectedColor?.color_name === color.color_name ? 'active' : ''}`}
                                                        style={{ backgroundColor: color.color_hex || '#ccc' }}
                                                        onClick={() => setSelectedColor(color)}
                                                        title={color.color_name}
                                                        aria-label={`Seleccionar color ${color.color_name}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Selector Talle */}
                                    {variantsForSelectedColor.length > 0 && (
                                        <div className="variant-selector">
                                            <label>Talle:</label>
                                            <div className="size-button-list">
                                                {variantsForSelectedColor.map(variant => (
                                                    <button key={variant.id}
                                                        className={`size-button ${selectedVariant?.id === variant.id ? 'active' : ''} ${variant.stock <= 0 ? 'disabled' : ''}`}
                                                        onClick={() => setSelectedVariant(variant)}
                                                        disabled={variant.stock <= 0}
                                                        title={variant.stock <= 0 ? 'Sin stock' : `Seleccionar talle ${variant.size}`}
                                                        aria-label={`Seleccionar talle ${variant.size}${variant.stock <= 0 ? ' (Sin stock)' : ''}`}
                                                    >
                                                        {variant.size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Info Stock Variant */}
                                    <div className="stock-info">
                                        {selectedVariant ?
                                            (selectedVariant.stock > 0 ? `${selectedVariant.stock} unidades disponibles` : 'Sin stock') :
                                            (availableColors.length > 0 && variantsForSelectedColor.length === 0 ? 'Color no disponible' : 'Selecciona talle')
                                        }
                                    </div>
                                </>
                            )}

                            {/* CASO: SIMPLE */}
                            {product.product_type === 'SIMPLE' && (
                                <div className="stock-info">
                                    {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock'}
                                </div>
                            )}

                            {/* CASO: BUNDLE */}
                            {product.product_type === 'BUNDLE' && (
                                <div className="bundle-selectors">
                                    {(product.bundle_links || []).map(link => (
                                        <div key={link.id} className="variant-selector">
                                            <label>{link.component_product?.name || 'Componente'}:</label>
                                            <div className="size-button-list">
                                                {(link.product_variants_options || [])
                                                    .map(variant_option => (
                                                        <button key={variant_option.id}
                                                            className={`size-button ${selectedBundleVariants[link.id] === variant_option.id ? 'active' : ''} ${variant_option.stock <= 0 ? 'disabled' : ''}`}
                                                            onClick={() => setSelectedBundleVariants(prev => ({
                                                                ...prev,
                                                                [link.id]: variant_option.id // Actualiza solo esta pieza
                                                            }))}
                                                            disabled={variant_option.stock <= 0}
                                                            title={variant_option.stock <= 0 ? 'Sin stock' : `Seleccionar ${link.component_product?.name || 'pieza'} talle ${variant_option.size}`}
                                                            aria-label={`Seleccionar ${link.component_product?.name || 'pieza'} talle ${variant_option.size}${variant_option.stock <= 0 ? ' (Sin stock)' : ''}`}
                                                        >
                                                            {variant_option.size}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Info Stock Bundle */}
                                    <div className="stock-info">
                                        {Object.keys(selectedBundleVariants).length !== product.bundle_links?.length ? 'Selecciona una opción para cada parte' :
                                            (bundleStock > 0 ? `${bundleStock} conjuntos disponibles` : 'Sin stock en esta combinación')}
                                    </div>
                                </div>
                            )}

                            {/* Botón AddToCart */}
                            <button onClick={handleAddToCart} className="btn-primary add-to-cart-btn" disabled={isAddToCartDisabled}>
                                {isAddToCartDisabled && product.product_type === 'BUNDLE' && Object.keys(selectedBundleVariants).length !== product.bundle_links?.length ? 'Selecciona opciones' :
                                    isAddToCartDisabled ? 'Sin Stock' :
                                        'Agregar al Carrito'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* --- Sección Recomendados --- */}
                {recommendedProducts && recommendedProducts.length > 0 && (
                    <section className="content-section-alt">
                        <h2>También te puede interesar</h2>
                        <div className="product-grid">
                            {recommendedProducts.map((recProduct) => (
                                <Link href={`/productos/${recProduct.id}`} key={recProduct.id} passHref>
                                    <div className="product-card" style={{ cursor: 'pointer' }}>
                                        <Image src={getRecommendedImage(recProduct)} alt={recProduct.name}
                                            width={300} height={280} style={{ objectFit: 'cover' }} />
                                        <h4>{recProduct.name}</h4>
                                        <p className="price">Desde ${recProduct.base_price}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <Footer />
        </>
    );
}

// --- getStaticPaths (Sin cambios recientes) ---
export async function getStaticPaths() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: products, error } = await supabase.from('products').select('id');
    if (error || !products) return { paths: [], fallback: 'blocking' };
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' };
}

// --- getStaticProps (FINAL, versión completa y correcta) ---
export async function getStaticProps({ params }) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { id } = params;

    // 1. Fetch producto principal
    const { data: product, error: productError } = await supabase
        .from('products')
        .select(`*, product_variants (*), bundle_links (id, quantity, product_variants!inner(product_id))`) // Trae variantes y links iniciales
        .eq('id', id)
        .single();

    if (productError || !product) { console.error(`Error fetching product ${id}:`, productError?.message); return { notFound: true }; }

    // 2. Si es BUNDLE, fetch todas las variantes de los componentes para las opciones
    if (product.product_type === 'BUNDLE' && product.bundle_links?.length > 0) {
        // Obtenemos IDs únicos de los productos que componen el bundle
        const componentProductIds = [...new Set(product.bundle_links.map(link => link.product_variants.product_id))];

        // Hacemos la consulta para traer todas las variantes de esos productos
        const { data: componentVariantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select(`id, product_id, color_name, color_hex, size, stock, variant_image_url, products (id, name, image_url)`) // Incluye datos del producto padre
            .in('product_id', componentProductIds);

        if (variantsError) { console.error(`Error fetching component variants for bundle ${id}:`, variantsError.message); return { notFound: true }; }

        // "Hidratamos" los bundle_links con las opciones completas y datos del componente
        product.bundle_links = product.bundle_links.map(link => {
            // Encuentra la info del producto padre (componente) de esta variante específica
            const componentInfo = componentVariantsData.find(v => v.product_id === link.product_variants.product_id)?.products;
            return {
                ...link, // Mantiene id, quantity
                component_product: componentInfo || { name: 'Componente Desconocido' }, // Info del producto componente
                // Filtra y añade TODAS las variantes disponibles para esta pieza específica
                product_variants_options: componentVariantsData.filter(
                    variant => variant.product_id === link.product_variants.product_id
                ) || [] // Asegura que sea un array
            };
            // Filtra links si su componente asociado no tenía variantes (caso raro pero seguro)
        }).filter(link => link.product_variants_options.length > 0);

        // Advertencia si el bundle queda sin componentes válidos después de filtrar
        if (product.bundle_links.length === 0) { console.warn(`Bundle ${id} no tiene componentes válidos con variantes.`); }
    }

    // 3. Fetch productos recomendados
    const { data: recommendedProducts, error: recommendedError } = await supabase
        .from('products')
        .select(`id, name, base_price, product_type, image_url, tag, product_variants (variant_image_url), bundle_links ( product_variants ( variant_image_url ) )`) // Select completo para getRecommendedImage
        .eq('tag', 'Destacado') // Filtra por tag
        .neq('id', id) // Excluye el producto actual
        .limit(4); // Limita a 4

    if (recommendedError) { console.error("Error fetching recommended products:", recommendedError.message); }

    // Retorna las props, usando JSON.parse(JSON.stringify()) para asegurar serialización
    return {
        props: {
            product: JSON.parse(JSON.stringify(product)),
            recommendedProducts: recommendedProducts || []
        },
        revalidate: 60 // Revalida cada 60 segundos
    };
}