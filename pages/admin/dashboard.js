// pages/admin/dashboard.js
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { SketchPicker } from 'react-color';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- FUNCIÓN DE REVALIDACIÓN (SIN CAMBIOS) ---
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

// --- COMPONENTE PRINCIPAL (ACTUALIZADO) ---
export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // --- NUEVOS ESTADOS Y VISTAS ---
    const [view, setView] = useState('products'); // Vista inicial: 'products'
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]); // Nuevo estado para pedidos
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
            } else {
                setUser(session.user);
                // Ahora cargamos productos Y pedidos al iniciar
                await Promise.all([
                    fetchProducts(),
                    fetchOrders() 
                ]);
                setIsLoading(false);
            }
        };
        checkUserAndFetchData();
    }, [router]);

    // --- FETCH DE PRODUCTOS (SIN CAMBIOS) ---
    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`*, product_variants (*)`)
            .order('id', { ascending: false });
        if (error) console.error("Error al cargar productos:", error.message);
        else setProducts(data || []);
    };

    // --- NUEVA FUNCIÓN: FETCH DE PEDIDOS ---
    const fetchOrders = async () => {
        // Esta es la consulta compleja:
        // Traemos orders, y dentro de cada pedido (orders), traemos sus items (order_items),
        // y dentro de cada item, traemos el producto simple (products) O
        // la variante (product_variants) Y el producto padre de esa variante (products anidado).
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
            .order('created_at', { ascending: false }); // Pedidos más nuevos primero

        if (error) console.error("Error al cargar pedidos:", error.message);
        else setOrders(data || []);
    };
    
    // --- MANEJADORES (ACTUALIZADOS) ---
    const handleDeleteProduct = async (productId, productName) => {
        // ... (Tu código de handleDeleteProduct sin cambios)...
        // Solo asegúrate que llame a fetchProducts() al final
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    // Funciones para cambiar de vista
    const handleAddNewProduct = () => { setEditingProduct(null); setView('form'); };
    const handleEditProduct = (product) => { setEditingProduct(product); setView('form'); };
    // Callback para volver a la lista de productos
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
                {/* --- NUEVOS BOTONES DE NAVEGACIÓN --- */}
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
                {/* Vista de Productos */}
                {view === 'products' && (
                    <ProductListView products={products} onAddNew={handleAddNewProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                )}
                {/* Vista de Formulario de Producto */}
                {view === 'form' && (
                    <ProductFormView product={editingProduct} onBack={() => setView('products')} onSave={handleSaveAndBack} />
                )}
                {/* --- NUEVA VISTA DE PEDIDOS --- */}
                {view === 'orders' && (
                    <OrderListView orders={orders} />
                )}
            </main>
        </div>
    );
}

// --- NUEVO COMPONENTE: VISTA DE LISTA DE PEDIDOS ---
function OrderListView({ orders }) {
    
    // Helper para obtener el nombre (sin cambios)
    const getOrderItemName = (item) => {
        if (item.products) return item.products.name;
        if (item.product_variants) {
            const productName = item.product_variants.products.name;
            const color = item.product_variants.color_name || '';
            const size = item.product_variants.size || '';
            return `${productName} (${color} - ${size})`;
        }
        return 'Producto desconocido';
    };

    // Helper para obtener la imagen (sin cambios)
    const getOrderItemImage = (item) => {
        if (item.products) return item.products.image_url;
        if (item.product_variants) return item.product_variants.variant_image_url;
        return '/logo-vidaanimada.png';
    };

    // --- ¡NUEVO! ---
    // Función para manejar el cambio de estado
    const handleStatusChange = async (orderId, newStatus) => {
        // Confirmación optimista (el estado cambia en la UI primero)
        // (Aquí podríamos actualizar el estado local 'orders' para una UI más rápida)
        
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus }) // Actualizamos el campo 'status'
                .eq('id', orderId); // Donde el ID coincida

            if (error) throw error;
            
            alert(`Pedido ${orderId.split('-')[0]}... actualizado a "${newStatus}".`);
            // Para una UI 100% precisa, deberíamos recargar los pedidos con fetchOrders()
            // pero por ahora, un refresco de página es suficiente si el admin lo necesita.

        } catch (error) {
            alert("Error al actualizar el estado: " + error.message);
        }
    };

    return (
        <div className="admin-section">
            <h2>Listado de Pedidos ({orders.length})</h2>
            <div className="table-container">
                <table className="products-table orders-table">
                    <thead>
                        <tr>
                            <th>ID Pedido</th>
                            <th>Fecha</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td title={order.id} className="order-id">{order.id.split('-')[0]}...</td>
                                <td>{new Date(order.created_at).toLocaleString('es-AR')}</td>
                                <td className="order-items-cell">
                                    {order.order_items.map(item => (
                                        <div key={item.id || Math.random()} className="order-item-detail">
                                            <Image src={getOrderItemImage(item)} alt="" width={40} height={40} className="table-product-image-small" />
                                            <span>
                                                {item.quantity} x {getOrderItemName(item)}
                                                <em> (Sub: ${item.unit_price * item.quantity})</em>
                                            </span>
                                        </div>
                                    ))}
                                </td>
                                <td className="order-total">${order.total_price}</td>
                                
                                {/* --- ¡ACTUALIZADO! --- */}
                                {/* Reemplazamos el <span> por un <select> */}
                                <td>
                                    <select
                                        className={`status-select status-${order.status}`}
                                        defaultValue={order.status}
                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                    >
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


// --- VISTA DE LISTA DE PRODUCTOS (SIN CAMBIOS) ---
function ProductListView({ products, onAddNew, onEdit, onDelete }) {
    // ... (Tu componente ProductListView completo, sin cambios) ...
    return (
        <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Listado de Productos ({products.length})</h2>
                <button onClick={onAddNew} className="btn-primary">Agregar Nuevo Producto</button>
            </div>
            <div className="table-container">
                <table className="products-table">
                    <thead><tr><th>Nombre</th><th>Categoría</th><th>Tipo</th><th>Stock/Variantes</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.category}</td>
                                <td>{p.has_variants ? 'Variable' : 'Simple'}</td>
                                <td>{p.has_variants ? `${p.product_variants.length} variantes` : `${p.stock} u.`}</td>
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

// --- VISTA DE FORMULARIO DE PRODUCTO (ACTUALIZADA) ---
// (Actualizada para que onSave() llame a la nueva función de callback)
function ProductFormView({ product, onBack, onSave }) {
    // ... (Todos tus 'useState' para el formulario, sin cambios) ...
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || '');
    const [tag, setTag] = useState(product?.tag || '');
    const [isSaving, setIsSaving] = useState(false);
    const [hasVariants, setHasVariants] = useState(product?.has_variants || false);
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

    const handleSaveProduct = async (e) => {
        // ... (Tu lógica de handleSaveProduct sin cambios) ...
        e.preventDefault();
        setIsSaving(true);
        let imageUrl = currentImageUrl;

        try {
            if (!hasVariants && simpleImageFile) {
                const fileName = `${Date.now()}-${simpleImageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, simpleImageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = await supabase.storage.from('product-images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            const productData = {
                name, description, category, tag,
                base_price: parseFloat(basePrice),
                has_variants: hasVariants,
                stock: hasVariants ? null : parseInt(simpleStock, 10),
                image_url: hasVariants ? null : imageUrl
            };

            let currentProductId = product?.id;
            if (!currentProductId) {
                const { data, error } = await supabase.from('products').insert(productData).select().single();
                if (error) throw error;
                currentProductId = data.id;
                alert("Producto creado.");
                product = data;
            } else {
                const { error } = await supabase.from('products').update(productData).eq('id', currentProductId);
                if (error) throw error;
                alert("Producto actualizado.");
            }

            await revalidateStaticPages(currentProductId);
            onSave(); // <-- Esto ahora llama a handleSaveAndBack()
        } catch (error) {
            console.error("Error detallado:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddVariant = async (e) => {
        // ... (Tu lógica de handleAddVariant sin cambios) ...
        e.preventDefault();
        if (!product || !product.id) {
            alert("Guarda primero los datos generales del producto.");
            return;
        }
        // ... (resto de la función)
        let variantImageUrl = null;
        if (newVariantImageFile) {
            const fileName = `${Date.now()}-VAR-${newVariantImageFile.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newVariantImageFile);
            if (uploadError) { alert("Error al subir imagen de variante: " + uploadError.message); return; }
            const { data: { publicUrl } } = await supabase.storage.from('product-images').getPublicUrl(fileName);
            variantImageUrl = publicUrl;
        }

        const { data, error } = await supabase.from('product_variants').insert({
            product_id: product.id,
            color_name: newVariantColorName || null,
            color_hex: newVariantColorHex || null,
            size: newVariantSize || null,
            stock: parseInt(newVariantStock, 10),
            variant_image_url: variantImageUrl
        }).select().single();

        if (error) { alert("Error al agregar variante: " + error.message); }
        else {
            setVariants([...variants, data]);
            setNewVariantColorName(''); setNewVariantColorHex('#CCCCCC'); setNewVariantSize(''); setNewVariantStock(0); setNewVariantImageFile(null);
            if (document.getElementById('newVariantImageFile')) document.getElementById('newVariantImageFile').value = '';
            await revalidateStaticPages(product.id);
        }
    };

    const handleDeleteVariant = async (variantId) => {
        // ... (Tu lógica de handleDeleteVariant sin cambios) ...
        if (!confirm("¿Seguro que quieres eliminar esta variante?")) return;
        const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
        if (error) { alert("Error al eliminar variante: " + error.message); }
        else {
            setVariants(variants.filter(v => v.id !== variantId));
            await revalidateStaticPages(product.id);
        }
    };

    const handleEditVariantClick = (variant) => {
        setManagingVariant(variant);
    };

    const handleSaveVariantChanges = async (updatedVariant) => {
        // ... (Tu lógica de handleSaveVariantChanges sin cambios) ...
        setVariants(variants.map(v => v.id === updatedVariant.id ? updatedVariant : v));
        setManagingVariant(null);
        await revalidateStaticPages(product.id);
    };

    return (
        <>
            {/* ... (Todo tu JSX/HTML del formulario, sin cambios) ... */}
            <div className="admin-section">
                <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Volver</button>
                <h2>{product ? `Gestionando: ${product.name}` : "Agregar Producto"}</h2>
                <form onSubmit={handleSaveProduct} className="add-product-form">
                    <h3>Datos Generales</h3>
                    <div className="checkbox-container add-form-checkbox">
                        <input type="checkbox" id="hasVariants" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} />
                        <label htmlFor="hasVariants">Tiene variantes (colores/talles)</label>
                    </div>
                    <input type="text" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required />
                    <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows="3" />
                    <input type="text" placeholder="Categoría" value={category} onChange={e => setCategory(e.target.value)} required />
                    <input type="number" step="0.01" placeholder="Precio Base" value={basePrice} onChange={e => setBasePrice(e.target.value)} required />
                    <input type="text" placeholder="Etiqueta (ej: Destacado)" value={tag} onChange={e => setTag(e.target.value)} />
                    {!hasVariants && (
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
                    <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar Datos"}</button>
                </form>

                {product && hasVariants && (
                    <div className="variants-section">
                        <h3>Variantes del Producto</h3>
                        <div className="table-container">
                            <table className="products-table">
                                <thead><tr><th>Imagen</th><th>Color</th><th>Talle</th><th>Stock</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {variants.map(v => (
                                        <tr key={v.id}>
                                            <td><Image src={v.variant_image_url || product.image_url || '/logo-vidaanimada.png'} alt={`${v.color_name} ${v.size}`} width={50} height={50} className="table-product-image" /></td>
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
                            <button type="submit" className="btn-primary" disabled={!product || !product.id}>Añadir Variante</button>
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

// --- MODAL DE EDICIÓN DE VARIANTE (SIN CAMBIOS) ---
function EditVariantModal({ variant, onClose, onSave }) {
    // ... (Todo tu componente EditVariantModal, sin cambios) ...
    const [colorName, setColorName] = useState(variant.color_name || '');
    const [colorHex, setColorHex] = useState(variant.color_hex || '#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [size, setSize] = useState(variant.size || '');
    const [stock, setStock] = useState(variant.stock || 0);
    const [imageFile, setImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState(variant.variant_image_url || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let finalImageUrl = currentImageUrl;
        try {
            if (imageFile) {
                const fileName = `${Date.now()}-VAR-${imageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = await supabase.storage.from('product-images').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
            }
            const { data, error } = await supabase.from('product_variants').update({
                color_name: colorName,
                color_hex: colorHex,
                size: size,
                stock: parseInt(stock, 10),
                variant_image_url: finalImageUrl
            }).eq('id', variant.id).select().single();
            if (error) throw error;
            onSave(data);
        } catch (error) {
            alert("Error al actualizar variante: " + error.message);
        } finally {
            setIsSaving(false);
        }
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