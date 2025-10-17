// pages/admin/dashboard.js
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { SketchPicker } from 'react-color';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- FUNCIÓN DE REVALIDACIÓN ---
async function revalidateStaticPages(productId = null) {
    console.log("Iniciando revalidación...");
    try {
        const revalidateUrl = `/api/revalidate?secret=${process.env.NEXT_PUBLIC_REVALIDATE_TOKEN}`;
        const urlToCall = productId ? `${revalidateUrl}&id=${productId}` : revalidateUrl;
        await fetch(urlToCall);
        console.log("Revalidación solicitada para:", urlToCall);
    } catch (err) {
        console.error("Error al solicitar la revalidación:", err);
    }
}

// --- COMPONENTE PRINCIPAL ---
export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const [view, setView] = useState('products');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
            } else {
                setUser(session.user);
                await Promise.all([
                    fetchProducts(),
                    fetchOrders()
                ]);
                setIsLoading(false);
            }
        };
        checkUserAndFetchData();
    }, [router]);

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (*),
                bundle_links (
                  id, quantity,
                  product_variants ( id, color_name, size, products (id, name) )
                )
            `)
            .order('id', { ascending: false });
        if (error) console.error("Error al cargar productos:", error.message);
        else setProducts(data || []);
    };

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, created_at, total_price, status,
                order_items (
                  quantity, unit_price,
                  products (id, name, image_url),
                  product_variants (
                    id, color_name, size, variant_image_url,
                    products (id, name)
                  )
                )
            `)
            .order('created_at', { ascending: false });
        if (error) console.error("Error al cargar pedidos:", error.message);
        else setOrders(data || []);
    };
    
    const handleDeleteProduct = async (productId, productName) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar "${productName}" y todas sus variantes/componentes? Esta acción es permanente.`)) return;
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            alert("Error al eliminar el producto: " + error.message);
        } else {
            alert(`Producto "${productName}" eliminado.`);
            await revalidateStaticPages(productId);
            fetchProducts(); // Recarga la lista
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const handleAddNewProduct = () => { setEditingProduct(null); setView('form'); };
    const handleEditProduct = (product) => { setEditingProduct(product); setView('form'); };
    
    const handleSaveAndBack = async () => {
        await fetchProducts();
        setView('products');
    };

    if (isLoading) { return <div className="loading-screen">Cargando...</div>; }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                 <div>
                     <h1>Dashboard</h1>
                     <p>Bienvenido, {user?.email}</p>
                 </div>
                 <nav className="admin-nav">
                     <button onClick={() => setView('products')} className={view === 'products' || view === 'form' ? 'active' : ''}>
                         Productos ({products.length})
                     </button>
                     <button onClick={() => setView('orders')} className={view === 'orders' ? 'active' : ''}>
                         Pedidos ({orders.length})
                     </button>
                 </nav>
                 <div>
                     <button onClick={() => router.push('/')} className="btn-secondary" style={{ marginRight: '1rem' }}>Ver Tienda</button>
                     <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
                 </div>
            </header>
            <main className="admin-main">
                {view === 'products' && (
                    <ProductListView products={products} onAddNew={handleAddNewProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                )}
                {view === 'form' && (
                    <ProductFormView 
                        product={editingProduct} 
                        onBack={() => setView('products')} 
                        onSave={handleSaveAndBack}
                        allProducts={products}
                    />
                )}
                {view === 'orders' && (
                    <OrderListView orders={orders} fetchOrders={fetchOrders} /> {/* Pasamos fetchOrders para recargar */}
                )}
            </main>
        </div>
    );
}

// --- VISTA LISTA PRODUCTOS ---
function ProductListView({ products, onAddNew, onEdit, onDelete }) {
    const getStockInfo = (product) => {
        switch (product.product_type) {
            case 'SIMPLE': return `${product.stock} u.`;
            case 'VARIANT': return `${product.product_variants.length} variantes`;
            case 'BUNDLE': return `${product.bundle_links.length} componentes`;
            default: return '-';
        }
    };
    return (
        <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Listado de Productos ({products.length})</h2>
                <button onClick={onAddNew} className="btn-primary">Agregar Nuevo Producto</button>
            </div>
            <div className="table-container">
                <table className="products-table">
                    <thead><tr><th>Nombre</th><th>Categoría</th><th>Tipo</th><th>Stock/Componentes</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.category}</td>
                                <td><span className={`status-badge status-${p.product_type}`}>{p.product_type}</span></td>
                                <td>{getStockInfo(p)}</td>
                                <td className="variant-actions">
                                    <button onClick={() => onEdit(p)} className="btn-edit">Gestionar</button>
                                    <button onClick={() => onDelete(p.id, p.name)} className="btn-delete">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- VISTA FORMULARIO PRODUCTO (CORREGIDA) ---
function ProductFormView({ product, onBack, onSave, allProducts }) {
    const [currentProduct, setCurrentProduct] = useState(product); // <-- ESTADO LOCAL
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || '');
    const [tag, setTag] = useState(product?.tag || '');
    const [isSaving, setIsSaving] = useState(false);
    const [productType, setProductType] = useState(product?.product_type || 'VARIANT');
    const [simpleStock, setSimpleStock] = useState(product?.stock || 0);
    const [simpleImageFile, setSimpleImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState(product?.image_url || '');
    const [variants, setVariants] = useState(product?.product_variants || []);
    const [newVariantColorName, setNewVariantColorName] = useState('');
    const [newVariantColorHex, setNewVariantColorHex] = useState('#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [newVariantSize, setNewVariantSize] = useState('');
    const [newVariantStock, setNewVariantStock] = useState(0);
    const [newVariantImageFile, setNewVariantImageFile] = useState(null);
    const [managingVariant, setManagingVariant] = useState(null);
    const [bundleLinks, setBundleLinks] = useState(product?.bundle_links || []);
    const [selectedBundleProduct, setSelectedBundleProduct] = useState('');
    const [selectedBundleVariant, setSelectedBundleVariant] = useState('');

    const variantProducts = useMemo(() => allProducts.filter(p => p.product_type === 'VARIANT'), [allProducts]);
    const variantsForSelectedBundleProduct = useMemo(() => {
        const foundProduct = variantProducts.find(p => p.id === selectedBundleProduct);
        return foundProduct ? foundProduct.product_variants : [];
    }, [selectedBundleProduct, variantProducts]);

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let imageUrl = currentImageUrl;
        try {
            if (productType === 'SIMPLE' && simpleImageFile) {
                const fileName = `${Date.now()}-${simpleImageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, simpleImageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName); // CORREGIDO: Quitar await
                imageUrl = publicUrl;
            }
            const productData = {
                name, description, category, tag, product_type: productType,
                base_price: parseFloat(basePrice),
                stock: productType === 'SIMPLE' ? parseInt(simpleStock, 10) : null,
                image_url: productType === 'SIMPLE' ? imageUrl : null
                // has_variants fue eliminada correctamente
            };
            let currentProductId = currentProduct?.id; // <-- USA currentProduct
            if (!currentProductId) {
                const { data, error } = await supabase.from('products').insert(productData).select().single();
                if (error) throw error;
                currentProductId = data.id;
                alert("Producto creado.");
                setCurrentProduct(data); // <-- ACTUALIZA ESTADO LOCAL
            } else {
                const { error } = await supabase.from('products').update(productData).eq('id', currentProductId);
                if (error) throw error;
                alert("Producto actualizado.");
                 // Actualiza el estado local también al editar (opcional pero bueno)
                 setCurrentProduct(prev => ({ ...prev, ...productData }));
            }
            await revalidateStaticPages(currentProductId);
            // No llamamos a onSave() todavía si es un producto nuevo,
            // para permitir añadir variantes/componentes antes de volver.
            // Si es una edición, sí podemos volver:
            if (product) { // Si 'product' (la prop original) existía, era una edición
                 onSave(); 
            } else {
                 setIsSaving(false); // Solo quita el estado de guardando si es nuevo
                 // El usuario se queda en el form para añadir variantes/componentes
            }
        } catch (error) {
            console.error("Error detallado:", error);
            alert("Error al guardar: " + error.message);
            setIsSaving(false); // Asegura quitar el estado de guardando en caso de error
        }
        // finally { // Quitamos el finally para controlar 'isSaving' manualmente
        //    setIsSaving(false);
        // }
    };

    const handleAddVariant = async (e) => {
        e.preventDefault();
        if (!currentProduct || !currentProduct.id) { // <-- USA currentProduct
            alert("Guarda primero los datos generales del producto."); return;
        }
        let variantImageUrl = null;
        if (newVariantImageFile) {
            const fileName = `${Date.now()}-VAR-${newVariantImageFile.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newVariantImageFile);
            if (uploadError) { alert("Error al subir imagen de variante: " + uploadError.message); return; }
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName); // CORREGIDO: Quitar await
            variantImageUrl = publicUrl;
        }
        const { data, error } = await supabase.from('product_variants').insert({
            product_id: currentProduct.id, // <-- USA currentProduct
            color_name: newVariantColorName || null, color_hex: newVariantColorHex || null,
            size: newVariantSize || null, stock: parseInt(newVariantStock, 10),
            variant_image_url: variantImageUrl
        }).select().single();
        if (error) { alert("Error al agregar variante: " + error.message); }
        else {
            setVariants([...variants, data]);
            setNewVariantColorName(''); setNewVariantColorHex('#CCCCCC'); setNewVariantSize(''); setNewVariantStock(0); setNewVariantImageFile(null);
            if (document.getElementById('newVariantImageFile')) document.getElementById('newVariantImageFile').value = '';
            await revalidateStaticPages(currentProduct.id); // <-- USA currentProduct
        }
    };

    const handleDeleteVariant = async (variantId) => {
        if (!currentProduct || !currentProduct.id) return; // <-- USA currentProduct
        if (!confirm("¿Seguro que quieres eliminar esta variante?")) return;
        const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
        if (error) { alert("Error al eliminar variante: " + error.message); }
        else {
            setVariants(variants.filter(v => v.id !== variantId));
            await revalidateStaticPages(currentProduct.id); // <-- USA currentProduct
        }
    };
    
    const handleEditVariantClick = (variant) => { setManagingVariant(variant); };

    const handleSaveVariantChanges = async (updatedVariant) => {
        if (!currentProduct || !currentProduct.id) return; // <-- USA currentProduct
        setVariants(variants.map(v => v.id === updatedVariant.id ? updatedVariant : v));
        setManagingVariant(null);
        await revalidateStaticPages(currentProduct.id); // <-- USA currentProduct
    };

    const handleAddBundleComponent = async (e) => {
        e.preventDefault();
        if (!currentProduct || !currentProduct.id) { // <-- USA currentProduct
            alert("Guarda primero los datos generales del producto."); return;
        }
        if (!selectedBundleVariant) { alert("Selecciona una variante para añadir."); return; }
        const { data, error } = await supabase.from('bundle_links').insert({
            bundle_product_id: currentProduct.id, // <-- USA currentProduct
            variant_component_id: selectedBundleVariant, quantity: 1
        }).select(`*, product_variants (id, color_name, size, products (id, name))`).single();
        if (error) { alert("Error al añadir componente: " + error.message); }
        else {
            setBundleLinks([...bundleLinks, data]);
            setSelectedBundleProduct(''); setSelectedBundleVariant('');
        }
    };

    const handleDeleteBundleComponent = async (bundleLinkId) => {
        if (!confirm("¿Seguro que quieres quitar este componente del conjunto?")) return;
        const { error } = await supabase.from('bundle_links').delete().eq('id', bundleLinkId);
        if (error) { alert("Error al eliminar componente: " + error.message); }
        else { setBundleLinks(bundleLinks.filter(link => link.id !== bundleLinkId)); }
    };

    return (
        <>
            <div className="admin-section">
                <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Volver</button>
                <h2>{currentProduct ? `Gestionando: ${name}` : "Agregar Producto"}</h2>
                <form onSubmit={handleSaveProduct} className="add-product-form">
                    <h3>Datos Generales</h3>
                    <div className="form-field-full">
                        <label htmlFor="productType">Tipo de Producto</label>
                        <select id="productType" value={productType} onChange={(e) => setProductType(e.target.value)}>
                            <option value="SIMPLE">Simple (Ej: Lapiceras, con stock propio)</option>
                            <option value="VARIANT">Variante (Ej: Pantalón, con colores/talles)</option>
                            <option value="BUNDLE">Conjunto (Ej: Pijama, compuesto por variantes)</option>
                        </select>
                    </div>
                    <input type="text" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required />
                    <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows="3" />
                    <input type="text" placeholder="Categoría" value={category} onChange={e => setCategory(e.target.value)} required />
                    <input type="number" step="0.01" placeholder="Precio Base" value={basePrice} onChange={e => setBasePrice(e.target.value)} required />
                    <input type="text" placeholder="Etiqueta (ej: Destacado)" value={tag} onChange={e => setTag(e.target.value)} />
                    {productType === 'SIMPLE' && (
                        <>
                            <input type="number" placeholder="Stock" value={simpleStock} onChange={e => setSimpleStock(e.target.value)} required />
                            <div className="file-input-container">
                                <label htmlFor="simpleImageFile">Imagen Principal</label>
                                <input type="file" id="simpleImageFile" accept="image/*" onChange={(e) => setSimpleImageFile(e.target.files[0])} />
                                {simpleImageFile && <p className="selected-file-name">{simpleImageFile.name}</p>}
                                {!simpleImageFile && currentImageUrl && <p className="selected-file-name">Actual: <a href={currentImageUrl} target="_blank" rel="noopener noreferrer">Ver</a></p>}
                            </div>
                        </>
                    )}
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                        {isSaving ? "Guardando..." : (currentProduct ? "Actualizar Datos" : "Guardar y Continuar")}
                    </button>
                </form>

                {/* --- SECCIÓN VARIANTES (CORREGIDA CONDICIÓN) --- */}
                {currentProduct && productType === 'VARIANT' && (
                    <div className="variants-section">
                        <h3>Variantes del Producto</h3>
                        <div className="table-container">
                             <table className="products-table">
                                 <thead><tr><th>Imagen</th><th>Color</th><th>Talle</th><th>Stock</th><th>Acciones</th></tr></thead>
                                 <tbody>
                                     {variants.map(v => (
                                         <tr key={v.id}>
                                             <td><Image src={v.variant_image_url || '/logo-vidaanimada.png'} alt={`${v.color_name} ${v.size}`} width={50} height={50} className="table-product-image" /></td>
                                             <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '20px', height: '20px', backgroundColor: v.color_hex || '#fff', borderRadius: '50%', border: '1px solid #eee' }}></span>{v.color_name || '-'}</div></td>
                                             <td>{v.size || '-'}</td>
                                             <td>{v.stock} u.</td>
                                             <td className="variant-actions">
                                                 <button onClick={() => handleEditVariantClick(v)} className="btn-edit">Editar</button>
                                                 <button onClick={() => handleDeleteVariant(v.id)} className="btn-delete">Eliminar</button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                        <form onSubmit={handleAddVariant} className="add-variant-form">
                            <h4>Agregar Variante</h4>
                            <input type="text" placeholder="Nombre Color" value={newVariantColorName} onChange={e => setNewVariantColorName(e.target.value)} />
                            <div className="color-picker-wrapper">
                                <label>Color Hex</label>
                                <div className="color-swatch" onClick={() => setDisplayColorPicker(!displayColorPicker)}><div className="color-preview" style={{ background: newVariantColorHex }} /></div>
                                {displayColorPicker ? (<div className="color-popover"><div className="color-cover" onClick={() => setDisplayColorPicker(false)} /><SketchPicker color={newVariantColorHex} onChange={(color) => setNewVariantColorHex(color.hex)} /></div>) : null}
                            </div>
                            <input type="text" placeholder="Talle" value={newVariantSize} onChange={e => setNewVariantSize(e.target.value)} />
                            <input type="number" placeholder="Stock" value={newVariantStock} onChange={e => setNewVariantStock(e.target.value)} required />
                            <div className="file-input-container">
                                <label htmlFor="newVariantImageFile">Imagen Específica (Opcional)</label>
                                <input type="file" id="newVariantImageFile" accept="image/*" onChange={e => setNewVariantImageFile(e.target.files[0])} />
                                {newVariantImageFile && <p className="selected-file-name">{newVariantImageFile.name}</p>}
                            </div>
                             <button type="submit" className="btn-primary" disabled={!currentProduct}>Añadir Variante</button> {/* <-- DISABLED CORREGIDO */}
                        </form>
                    </div>
                )}
                
                {/* --- SECCIÓN BUNDLE (CORREGIDA CONDICIÓN) --- */}
                {currentProduct && productType === 'BUNDLE' && (
                    <div className="variants-section">
                        <h3>Componentes del Conjunto</h3>
                        <p>Define qué variantes componen este conjunto.</p>
                        <div className="table-container">
                            <table className="products-table">
                                <thead><tr><th>Producto Componente</th><th>Variante (Talle/Color)</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {bundleLinks.map(link => (
                                        <tr key={link.id}>
                                             <td>{link.product_variants?.products?.name || 'Producto no encontrado'}</td> {/* <-- Más seguro */}
                                             <td>{link.product_variants?.color_name || '-'} / {link.product_variants?.size || '-'}</td> {/* <-- Más seguro */}
                                            <td className="variant-actions">
                                                <button onClick={() => handleDeleteBundleComponent(link.id)} className="btn-delete">Quitar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <form onSubmit={handleAddBundleComponent} className="add-variant-form">
                            <h4>Agregar Componente</h4>
                            <div className="form-field-full">
                                <label htmlFor="bundleProduct">1. Selecciona el Producto</label>
                                <select id="bundleProduct" value={selectedBundleProduct} onChange={e => { setSelectedBundleProduct(e.target.value); setSelectedBundleVariant(''); }}>
                                    <option value="">Selecciona un producto...</option>
                                    {variantProducts.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                </select>
                            </div>
                            <div className="form-field-full">
                                <label htmlFor="bundleVariant">2. Selecciona la Variante</label>
                                <select id="bundleVariant" value={selectedBundleVariant} onChange={e => setSelectedBundleVariant(e.target.value)} disabled={!selectedBundleProduct}>
                                    <option value="">Selecciona una variante...</option>
                                    {variantsForSelectedBundleProduct.map(v => (<option key={v.id} value={v.id}>{v.color_name} / {v.size} (Stock: {v.stock})</option>))}
                                </select>
                            </div>
                             <button type="submit" className="btn-primary" disabled={!currentProduct || !selectedBundleVariant}>Añadir Componente</button> {/* <-- DISABLED CORREGIDO */}
                        </form>
                    </div>
                )}
            </div>
            {managingVariant && (
                <EditVariantModal
                    variant={managingVariant}
                    onClose={() => setManagingVariant(null)}
                    onSave={handleSaveVariantChanges}
                />
            )}
        </>
    );
}

// --- VISTA LISTA PEDIDOS ---
function OrderListView({ orders, fetchOrders }) { // <-- Recibe fetchOrders
    const getOrderItemName = (item) => { /* ... (Sin cambios) ... */ };
    const getOrderItemImage = (item) => { /* ... (Sin cambios) ... */ };
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) throw error;
            alert(`Pedido ${orderId.split('-')[0]}... actualizado a "${newStatus}".`);
            fetchOrders(); // <-- Recarga los pedidos al cambiar estado
        } catch (error) {
            alert("Error al actualizar el estado: " + error.message);
        }
    };
    return (
        <div className="admin-section">
            <h2>Listado de Pedidos ({orders.length})</h2>
            <div className="table-container">
                <table className="products-table orders-table">
                    <thead><tr><th>ID Pedido</th><th>Fecha</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td title={order.id} className="order-id">{order.id.split('-')[0]}...</td>
                                <td>{new Date(order.created_at).toLocaleString('es-AR')}</td>
                                <td className="order-items-cell">
                                    {order.order_items.map(item => (
                                        <div key={item.id || Math.random()} className="order-item-detail">
                                            <Image src={getOrderItemImage(item) || '/logo-vidaanimada.png'} alt="" width={40} height={40} className="table-product-image-small" />
                                            <span>{item.quantity} x {getOrderItemName(item)}<em> (Sub: ${(item.unit_price * item.quantity).toFixed(2)})</em></span>
                                        </div>
                                    ))}
                                </td>
                                <td className="order-total">${parseFloat(order.total_price).toFixed(2)}</td>
                                <td>
                                    <select className={`status-select status-${order.status}`} defaultValue={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)}>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="completado">Completado</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- MODAL EDICIÓN VARIANTE ---
function EditVariantModal({ variant, onClose, onSave }) {
    const [colorName, setColorName] = useState(variant.color_name || '');
    const [colorHex, setColorHex] = useState(variant.color_hex || '#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [size, setSize] = useState(variant.size || '');
    const [stock, setStock] = useState(variant.stock || 0);
    const [imageFile, setImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState(variant.variant_image_url || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault(); setIsSaving(true); let finalImageUrl = currentImageUrl;
        try {
            if (imageFile) {
                const fileName = `${Date.now()}-VAR-${imageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName); // CORREGIDO: Quitar await
                finalImageUrl = publicUrl;
            }
            const { data, error } = await supabase.from('product_variants').update({
                color_name: colorName, color_hex: colorHex, size: size,
                stock: parseInt(stock, 10), variant_image_url: finalImageUrl
            }).eq('id', variant.id).select().single();
            if (error) throw error;
            onSave(data);
        } catch (error) { alert("Error al actualizar variante: " + error.message); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Editando Variante</h2>
                <form onSubmit={handleUpdate}>
                     <label>Nombre Color</label><input type="text" value={colorName} onChange={e => setColorName(e.target.value)} />
                     <div className="color-picker-wrapper">
                         <label>Color Hex</label>
                         <div className="color-swatch" onClick={() => setDisplayColorPicker(!displayColorPicker)}><div className="color-preview" style={{ background: colorHex }} /></div>
                         {displayColorPicker ? (<div className="color-popover"><div className="color-cover" onClick={() => setDisplayColorPicker(false)} /><SketchPicker color={colorHex} onChange={(color) => setColorHex(color.hex)} /></div>) : null}
                     </div>
                     <label>Talle</label><input type="text" value={size} onChange={e => setSize(e.target.value)} />
                     <label>Stock</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} required />
                     <div className="file-input-container">
                         <label htmlFor="editVariantImageFile">Cambiar Imagen (Opcional)</label>
                         <input type="file" id="editVariantImageFile" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                         {imageFile && <p className="selected-file-name">{imageFile.name}</p>}
                         {!imageFile && currentImageUrl && <p className="selected-file-name">Actual: <a href={currentImageUrl} target="_blank" rel="noopener noreferrer">Ver</a></p>}
                     </div>
                    <div className="modal-actions">
                        <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}