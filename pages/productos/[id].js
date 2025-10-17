// pages/productos/[id].js
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// Cliente Supabase (fuera del componente)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage({ product, recommendedProducts }) {
    const { addToCart } = useCart();

    // Estados para tipo 'VARIANT'
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null); // Variante única seleccionada (ej: id de 'Rojo/M')

    // Estado para tipo 'BUNDLE' (guarda { linkId: variantId, ... })
    // linkId es el id de la fila en bundle_links (representa la "pieza" del conjunto)
    // variantId es el id de la product_variant seleccionada para esa pieza (ej: id de 'Remera Talle M')
    const [selectedBundleVariants, setSelectedBundleVariants] = useState({});

    // --- Lógica Derivada ---

    // Colores disponibles (solo para 'VARIANT')
    const availableColors = useMemo(() => {
        if (product.product_type !== 'VARIANT' || !product.product_variants) return [];
        const colors = new Map();
        product.product_variants.forEach(variant => {
            if (!colors.has(variant.color_name)) {
                colors.set(variant.color_name, {
                    color_name: variant.color_name,
                    color_hex: variant.color_hex,
                    image_url: variant.variant_image_url || '/logo-vidaanimada.png' // Fallback a logo
                });
            }
        });
        return Array.from(colors.values());
    }, [product]);

    // Variantes (talles) disponibles para el color seleccionado (solo para 'VARIANT')
    const variantsForSelectedColor = useMemo(() => {
        if (product.product_type !== 'VARIANT' || !selectedColor) return [];
        return product.product_variants.filter(
            variant => variant.color_name === selectedColor.color_name
        );
    }, [product, selectedColor]);

    // Stock disponible para el BUNDLE basado en las selecciones
    const bundleStock = useMemo(() => {
        if (product.product_type !== 'BUNDLE') return 0;
        let minStock = Infinity;
        let allSelected = true;

        if (!product.bundle_links || product.bundle_links.length === 0) {
            console.log("Bundle sin links definidos.");
            return 0; // Si no hay componentes definidos, no hay stock
        }

        // Verifica si se seleccionó una variante para CADA componente requerido
        if (Object.keys(selectedBundleVariants).length !== product.bundle_links.length) {
             // console.log("Faltan selecciones en el bundle.");
             allSelected = false;
        }

        product.bundle_links.forEach(link => {
            const selectedVariantId = selectedBundleVariants[link.id];
            if (!selectedVariantId) {
                // console.log(`Componente ${link.id} no seleccionado.`);
                allSelected = false; return; // Salir si falta una selección
            }
            // product_variants_options fue cargado en getStaticProps
            const variant = link.product_variants_options?.find(v => v.id === selectedVariantId);
            if (variant && variant.stock < minStock) {
                minStock = variant.stock;
            } else if (!variant) {
                 console.error(`Variante seleccionada ${selectedVariantId} no encontrada en opciones.`);
                 allSelected = false; // Variante no encontrada
            } else if (variant && variant.stock === 0) {
                 // Si alguna pieza seleccionada tiene stock 0, el stock del bundle es 0
                 minStock = 0;
            }
        });

        // console.log(`AllSelected: ${allSelected}, MinStock: ${minStock}`);
        if (!allSelected || minStock === Infinity || minStock < 0 ) return 0; // Asegura stock >= 0
        return minStock;
    }, [product, selectedBundleVariants]);


    // --- Efectos ---
    useEffect(() => {
        // Setear color por defecto (VARIANT)
        if (product.product_type === 'VARIANT' && availableColors.length > 0 && !selectedColor) {
            setSelectedColor(availableColors[0]);
        }
        // Setear variantes por defecto (BUNDLE)
        if (product.product_type === 'BUNDLE' && product.bundle_links) {
            const initialSelections = {};
            let possible = true;
            product.bundle_links.forEach(link => {
                // Intenta seleccionar la primera variante CON STOCK para cada componente
                const firstAvailableVariant = link.product_variants_options?.find(v => v.stock > 0);
                if (firstAvailableVariant) {
                    initialSelections[link.id] = firstAvailableVariant.id;
                } else {
                    console.warn(`Componente ${link.component_product?.name} no tiene variantes con stock.`);
                    possible = false; // No hay stock de alguna pieza requerida
                }
            });
            // Solo setea si todas las piezas tienen al menos una opción con stock
            if (possible && Object.keys(initialSelections).length === product.bundle_links.length) {
                // console.log("Setting initial bundle selections:", initialSelections);
                setSelectedBundleVariants(initialSelections);
            } else {
                 console.log("No se pudieron setear selecciones iniciales para el bundle (falta stock?).");
            }
        }
        // Limpiar selecciones si el producto cambia (evita inconsistencias)
        return () => {
            setSelectedColor(null);
            setSelectedVariant(null);
            setSelectedBundleVariants({});
        };
    }, [product, availableColors]); // Solo depende del producto y colores (para variant)

    useEffect(() => {
        // Setear talle por defecto cuando cambia el color (VARIANT)
        if (product.product_type === 'VARIANT' && selectedColor && variantsForSelectedColor.length > 0) {
            const firstAvailable = variantsForSelectedColor.find(v => v.stock > 0);
             // Si hay uno con stock, lo selecciona. Si no, selecciona el primero (aunque no tenga stock)
            setSelectedVariant(firstAvailable || variantsForSelectedColor[0]);
        } else if (product.product_type === 'VARIANT') {
             setSelectedVariant(null); // Limpia si no hay variantes para el color
        }
    }, [product.product_type, selectedColor, variantsForSelectedColor]); // Depende del color seleccionado

    // --- AGREGAR AL CARRITO ---
    const handleAddToCart = () => {
         switch (product.product_type) {
            case 'SIMPLE':
                if (product.stock > 0) {
                    addToCart({
                        id: product.id, name: product.name, price: product.base_price,
                        image_url: product.image_url, type: 'SIMPLE'
                    });
                    alert(`${product.name} agregado al carrito!`);
                } else { alert("Producto sin stock."); }
                break;
            case 'VARIANT':
                if (selectedVariant && selectedVariant.stock > 0) {
                    addToCart({
                        id: selectedVariant.id, name: product.name, price: product.base_price,
                        image_url: selectedVariant.variant_image_url || selectedColor?.image_url || '/logo-vidaanimada.png',
                        color_name: selectedColor?.color_name, size: selectedVariant.size, type: 'VARIANT'
                    });
                    alert(`${product.name} (${selectedColor?.color_name || ''}/${selectedVariant.size || ''}) agregado al carrito!`);
                } else { alert("Selección no disponible o sin stock."); }
                break;
            case 'BUNDLE':
                 // Verifica que se hayan seleccionado todas las partes y que haya stock
                 if (bundleStock > 0 && Object.keys(selectedBundleVariants).length === product.bundle_links.length) {
                    const componentVariantIds = Object.values(selectedBundleVariants);
                    const componentsDetails = product.bundle_links.map(link => {
                        const variantId = selectedBundleVariants[link.id];
                        // Busca la info completa de la variante seleccionada
                        const variant = link.product_variants_options?.find(v => v.id === variantId);
                        return {
                            // Nombre de la PIEZA (ej: Remera pijama dog)
                            componentName: link.component_product?.name || 'Pieza', 
                            // Descripción de la VARIANTE seleccionada (ej: Azul / M)
                            variantName: `${variant?.color_name || ''} / ${variant?.size || ''}`,
                            // Imagen de la VARIANTE seleccionada
                            image_url: variant?.variant_image_url || link.component_product?.image_url || '/logo-vidaanimada.png'
                        };
                    });
                    addToCart({
                        id: product.id, name: product.name, price: product.base_price,
                        // Usa la imagen del primer componente seleccionado como imagen principal del bundle en el carrito
                        image_url: componentsDetails[0]?.image_url || '/logo-vidaanimada.png',
                        type: 'BUNDLE',
                        // Array de IDs de las product_variants seleccionadas (para descontar stock)
                        componentVariantIds: componentVariantIds, 
                         // Array de objetos con detalles de cada componente (para mostrar en carrito/pedido)
                        componentsDetails: componentsDetails 
                    });
                    alert(`${product.name} agregado al carrito!`);
                } else { 
                     if (Object.keys(selectedBundleVariants).length !== product.bundle_links.length) {
                         alert("Por favor, selecciona una opción para cada parte del conjunto.");
                     } else {
                         alert("Conjunto no disponible en esta combinación de tallas o sin stock."); 
                     }
                 }
                break;
            default: alert("Tipo de producto desconocido.");
        }
    };


    if (!product) return <div>Cargando...</div>;

    // --- Lógica de Display ---
    const displayImage = 
        product.product_type === 'SIMPLE' ? product.image_url :
        product.product_type === 'VARIANT' ? (selectedColor?.image_url || product.product_variants?.[0]?.variant_image_url) :
        // Bundle: Muestra imagen de la variante seleccionada del primer componente, o fallback
        product.bundle_links?.[0]?.product_variants_options?.find(v => v.id === selectedBundleVariants[product.bundle_links[0]?.id])?.variant_image_url || 
        product.bundle_links?.[0]?.component_product?.image_url; 
        
    // Clave única para forzar refresh de <Image> al cambiar selecciones
    const displayImageKey = product.id + (selectedColor?.color_name || '') + JSON.stringify(selectedBundleVariants);

    // Determina si el botón "Agregar al Carrito" debe estar deshabilitado
    const isAddToCartDisabled = 
        (product.product_type === 'SIMPLE' && product.stock <= 0) ||
        (product.product_type === 'VARIANT' && (!selectedVariant || selectedVariant.stock <= 0)) ||
        (product.product_type === 'BUNDLE' && (bundleStock <= 0 || Object.keys(selectedBundleVariants).length !== product.bundle_links?.length));


    // Helper para imagen de recomendados
     const getRecommendedImage = (recProduct) => {
         switch (recProduct.product_type) {
             case 'SIMPLE': return recProduct.image_url || '/logo-vidaanimada.png';
             case 'VARIANT': return recProduct.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
             case 'BUNDLE': return recProduct.bundle_links?.[0]?.product_variants?.variant_image_url || '/logo-vidaanimada.png';
             default: return '/logo-vidaanimada.png';
         }
     };

    return (
        <>
            <Head><title>{product.name} - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <div className="product-detail-layout">
                        {/* Sección de Imagen */}
                        <div className="product-image-section">
                            <Image
                                src={displayImage || '/logo-vidaanimada.png'} alt={product.name}
                                width={500} height={500} style={{ objectFit: 'cover', borderRadius: '15px' }}
                                key={displayImageKey} priority // Carga prioritaria para LCP
                            />
                        </div>
                        {/* Sección de Información y Selectores */}
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>

                            {/* --- RENDERIZADO CONDICIONAL --- */}

                            {/* --- CASO: VARIANT --- */}
                            {product.product_type === 'VARIANT' && (
                                <>
                                    {/* Selector de Color */}
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
                                    {/* Selector de Talle */}
                                    {variantsForSelectedColor.length > 0 && (
                                        <div className="variant-selector">
                                            <label>Talle:</label>
                                            <div className="size-button-list">
                                                {variantsForSelectedColor.map(variant => (
                                                    <button key={variant.id}
                                                        className={`size-button ${selectedVariant?.id === variant.id ? 'active' : ''} ${variant.stock === 0 ? 'disabled' : ''}`}
                                                        onClick={() => setSelectedVariant(variant)}
                                                        disabled={variant.stock === 0}
                                                        title={variant.stock === 0 ? 'Sin stock' : `Seleccionar talle ${variant.size}`}
                                                        aria-label={`Seleccionar talle ${variant.size}${variant.stock === 0 ? ' (Sin stock)' : ''}`}
                                                    >
                                                        {variant.size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Info de Stock (Variable) */}
                                    <div className="stock-info">
                                        {selectedVariant ? 
                                            (selectedVariant.stock > 0 ? `${selectedVariant.stock} unidades disponibles` : 'Sin stock') : 
                                            (availableColors.length > 0 && variantsForSelectedColor.length === 0 ? 'Selecciona un color' : 'Selecciona un talle')
                                        }
                                    </div>
                                </>
                            )}

                            {/* --- CASO: SIMPLE --- */}
                            {product.product_type === 'SIMPLE' && (
                                <div className="stock-info">
                                    {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock'}
                                </div>
                            )}

                            {/* --- CASO: BUNDLE --- */}
                            {product.product_type === 'BUNDLE' && (
                                <div className="bundle-selectors">
                                    {/* Itera sobre cada "link" (pieza) del bundle */}
                                    {product.bundle_links.map(link => (
                                        <div key={link.id} className="variant-selector">
                                             {/* Label: Nombre de la pieza (ej: Remera pijama dog) */}
                                            <label>{link.component_product?.name || 'Componente'}:</label>
                                            {/* Lista de botones de talle para ESTA pieza */}
                                            <div className="size-button-list">
                                                {/* Itera sobre las opciones de variante para esta pieza */}
                                                 {(link.product_variants_options || [])
                                                    .map(variant_option => (
                                                    <button key={variant_option.id}
                                                        className={`size-button ${selectedBundleVariants[link.id] === variant_option.id ? 'active' : ''} ${variant_option.stock === 0 ? 'disabled' : ''}`}
                                                        onClick={() => setSelectedBundleVariants(prev => ({
                                                            ...prev,
                                                            [link.id]: variant_option.id // Actualiza la selección para este linkId
                                                        }))}
                                                        disabled={variant_option.stock === 0}
                                                        title={variant_option.stock === 0 ? 'Sin stock' : `Seleccionar ${link.component_product?.name || 'pieza'} talle ${variant_option.size}`}
                                                        aria-label={`Seleccionar ${link.component_product?.name || 'pieza'} talle ${variant_option.size}${variant_option.stock === 0 ? ' (Sin stock)' : ''}`}
                                                    >
                                                        {variant_option.size} 
                                                        {/* Podríamos añadir color si fuera relevante: {variant_option.color_name} */}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Info de Stock (Bundle) */}
                                    <div className="stock-info">
                                         {Object.keys(selectedBundleVariants).length !== product.bundle_links?.length ? 'Selecciona una opción para cada parte' :
                                         (bundleStock > 0 ? `${bundleStock} conjuntos disponibles` : 'Sin stock en esta combinación')}
                                    </div>
                                </div>
                            )}
                            
                            {/* --- Botón AddToCart (Común a todos) --- */}
                            <button onClick={handleAddToCart} className="btn-primary add-to-cart-btn" disabled={isAddToCartDisabled}>
                                {isAddToCartDisabled && product.product_type !== 'SIMPLE' && Object.keys(selectedBundleVariants).length !== product.bundle_links?.length ? 'Selecciona opciones' : 
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
                                               width={300} height={280} style={{ objectFit: 'cover' }} 
                                               // Añadir un placeholder difuminado puede mejorar la carga percibida
                                               // placeholder="blur" 
                                               // blurDataURL="/path/to/low-res-placeholder.jpg" 
                                        />
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


// --- getStaticPaths ---
export async function getStaticPaths() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: products, error } = await supabase.from('products').select('id'); 
    if (error || !products) return { paths: [], fallback: 'blocking' };
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' };
}

// --- getStaticProps (FINAL) ---
export async function getStaticProps({ params }) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { id } = params;

    // 1. Fetch producto principal
    const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*),
            bundle_links (
              id, quantity,
              product_variants!inner ( product_id ) 
            )
        `)
        .eq('id', id)
        .single();
    
    if (productError || !product) {
        console.error(`Error fetching product ${id}:`, productError?.message);
        return { notFound: true };
    }

    // 2. Si es BUNDLE, fetch todas las variantes de los componentes
    if (product.product_type === 'BUNDLE' && product.bundle_links?.length > 0) {
        // Obtenemos los IDs únicos de los productos que componen el bundle
        const componentProductIds = [...new Set(product.bundle_links.map(link => link.product_variants.product_id))];
        
        const { data: componentVariantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select(`
                id, product_id, color_name, color_hex, size, stock, variant_image_url,
                products (id, name, image_url) /* Traemos producto padre */
            `)
            .in('product_id', componentProductIds);

        if (variantsError) {
             console.error(`Error fetching component variants for bundle ${id}:`, variantsError.message);
             return { notFound: true }; // Error crítico
        }

        // "Hidratar" bundle_links con las opciones y datos del componente
        product.bundle_links = product.bundle_links.map(link => {
             // Encuentra la info del producto padre (componente) de esta variante específica
             const componentInfo = componentVariantsData.find(v => v.product_id === link.product_variants.product_id)?.products;
             return {
                 ...link,
                 component_product: componentInfo || { name: 'Componente Desconocido' }, // Nombre/Imagen de la pieza (Remera)
                 // Filtra y añade TODAS las variantes disponibles para esta pieza específica
                 product_variants_options: componentVariantsData.filter(
                     variant => variant.product_id === link.product_variants.product_id
                 ) || [] // Asegura que sea un array
             };
         });
    }
    
    // 3. Fetch productos recomendados
     const { data: recommendedProducts, error: recommendedError } = await supabase
        .from('products')
        .select(`
            id, name, base_price, product_type, image_url, tag, 
            product_variants (variant_image_url),
            bundle_links ( product_variants ( variant_image_url ) )
        `)
        .eq('tag', 'Destacado')
        .neq('id', id) 
        .limit(4);

    if (recommendedError) {
        console.error("Error fetching recommended products:", recommendedError.message);
    }

    // Usar JSON.stringify/parse es un truco común para asegurar la serialización correcta
    // de objetos complejos (como fechas o datos anidados) para getStaticProps.
    return { 
        props: { 
            product: JSON.parse(JSON.stringify(product)), 
            recommendedProducts: recommendedProducts || [] 
        }, 
        revalidate: 60 // Revalida cada minuto
    };
}