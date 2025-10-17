import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { SketchPicker } from 'react-color';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Función para llamar a la API de revalidación
async function revalidateStaticPages() {
    try {
        await fetch(`/api/revalidate?secret=${process.env.NEXT_PUBLIC_REVALIDATE_TOKEN}`);
        console.log("Petición de revalidación enviada.");
    } catch (error) {
        console.error("Error al revalidar:", error);
    }
}

// --- COMPONENTE PRINCIPAL ---
export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const [view, setView] = useState('list');
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        const checkUserAndFetchProducts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/admin/login'); }
            else { setUser(session.user); await fetchProducts(); setIsLoading(false); }
        };
        checkUserAndFetchProducts();
    }, [router]);

    // Consulta adaptada a la nueva estructura
    const fetchProducts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select(`*, product_variants(*)`) // Trae productos y sus variantes directas
            .order('id', { ascending: false });

        if (error) console.error("Error al cargar productos:", error.message);
        else setProducts(data || []);
        setIsLoading(false);
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar "${productName}" y todas sus variantes? Esta acción es permanente.`)) return;
        
        // Gracias al CASCADE, solo necesitamos borrar el producto principal
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            alert("Error al eliminar el producto: " + error.message);
        } else {
            alert(`Producto "${productName}" eliminado.`);
            await revalidateStaticPages(); // Revalida después de eliminar
            fetchProducts();
        }
    };

    const handleLogout = async () => { /* ... (sin cambios) ... */ };
    const handleAddNewProduct = () => { setEditingProduct(null); setView('form'); };
    const handleEditProduct = (product) => { setEditingProduct(product); setView('form'); };

    if (isLoading) { return <div className="loading-screen">Cargando...</div>; }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                {/* ... (sin cambios) ... */}
            </header>
            <main className="admin-main">
                {view === 'list' && (
                    <ProductListView products={products} onAddNew={handleAddNewProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                )}
                {view === 'form' && (
                    <ProductFormView product={editingProduct} onBack={() => setView('list')} onSave={fetchProducts} />
                )}
            </main>
        </div>
    );
}

// --- VISTA DE LISTA ---
function ProductListView({ products, onAddNew, onEdit, onDelete }) {
    return (
        <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Listado de Productos ({products.length})</h2>
                <button onClick={onAddNew} className="btn-primary">Agregar Nuevo Producto</button>
            </div>
            <div className="table-container">
                <table className="products-table">
                    {/* Adaptamos la cabecera */}
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

// --- VISTA DE FORMULARIO ---
function ProductFormView({ product, onBack, onSave }) {
    // Estados Producto Padre
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || '');
    const [tag, setTag] = useState(product?.tag || '');
    const [hasVariants, setHasVariants] = useState(product?.has_variants || false); // El interruptor
    const [isSaving, setIsSaving] = useState(false);

    // Estados Producto Simple
    const [simpleStock, setSimpleStock] = useState(product?.stock || 0);
    const [simpleImageFile, setSimpleImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState(product?.image_url || '');

    // Estados Producto Variable
    const [variants, setVariants] = useState(product?.product_variants || []);
    const [newVariantColorName, setNewVariantColorName] = useState('');
    const [newVariantColorHex, setNewVariantColorHex] = useState('#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [newVariantSize, setNewVariantSize] = useState('');
    const [newVariantStock, setNewVariantStock] = useState(0);
    const [newVariantImageFile, setNewVariantImageFile] = useState(null);
    const [managingVariant, setManagingVariant] = useState(null); // Para editar variante

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let imageUrl = currentImageUrl; // Mantiene la imagen actual por defecto

        try {
            // Sube la imagen principal solo si es simple y se seleccionó una nueva
            if (!hasVariants && simpleImageFile) {
                const fileName = `${Date.now()}-${simpleImageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, simpleImageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            const productData = {
                name, description, category, tag,
                base_price: parseFloat(basePrice),
                has_variants: hasVariants,
                // Si es simple, guarda el stock y la imagen; si es variable, los pone a null
                stock: hasVariants ? null : parseInt(simpleStock, 10),
                image_url: hasVariants ? null : imageUrl
            };

            let currentProductId = product?.id;
            if (!currentProductId) { // Crear producto nuevo
                const { data, error } = await supabase.from('products').insert(productData).select().single();
                if (error) throw error;
                currentProductId = data.id;
                 alert("Producto creado.");
                 product = data; // Actualiza el producto localmente
            } else { // Actualizar producto existente
                const { error } = await supabase.from('products').update(productData).eq('id', currentProductId);
                if (error) throw error;
                alert("Producto actualizado.");
            }
            
            await revalidateStaticPages();
            onSave(); // Refresca la lista
            // No volvemos atrás automáticamente al guardar, para poder gestionar variantes si es necesario

        } catch (error) {
            console.error("Error detallado:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- Lógica para Variantes (Solo si hasVariants es true) ---
    const handleAddVariant = async (e) => {
        e.preventDefault();
        if (!product) { alert("Guarda primero los datos generales."); return; }
        
        let variantImageUrl = null;
        if (newVariantImageFile) { // Sube imagen de variante si existe
            const fileName = `${Date.now()}-VAR-${newVariantImageFile.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newVariantImageFile);
            if (uploadError) { alert("Error al subir imagen de variante: " + uploadError.message); return; }
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
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
            // Limpiar formulario
            setNewVariantColorName(''); setNewVariantColorHex('#CCCCCC'); setNewVariantSize(''); setNewVariantStock(0); setNewVariantImageFile(null);
            if(document.getElementById('newVariantImageFile')) document.getElementById('newVariantImageFile').value = '';
            await revalidateStaticPages();
        }
    };

    const handleDeleteVariant = async (variantId) => {
        if (!confirm("¿Seguro que quieres eliminar esta variante?")) return;
        const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
        if (error) { alert("Error al eliminar variante: " + error.message); }
        else { 
            setVariants(variants.filter(v => v.id !== variantId));
            await revalidateStaticPages();
        }
    };

     // Abre el modal para editar variante
    const handleEditVariantClick = (variant) => {
        setManagingVariant(variant); // Pasa la variante completa al modal
    };
    
    // Función que se pasa al modal para guardar cambios
    const handleSaveVariantChanges = (updatedVariant) => {
        setVariants(variants.map(v => v.id === updatedVariant.id ? updatedVariant : v));
        setManagingVariant(null); // Cierra el modal
        revalidateStaticPages(); // Revalida
    };

    return (
        <>
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
                    
                    {!hasVariants && ( // Campos para producto simple
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

                {product && hasVariants && ( // Sección de variantes solo si es producto variable y ya existe
                    <div className="variants-section">
                        <h3>Variantes del Producto</h3>
                        <div className="table-container">
                            <table className="products-table">
                                <thead><tr><th>Imagen</th><th>Color</th><th>Talle</th><th>Stock</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {variants.map(v => (
                                        <tr key={v.id}>
                                            <td><Image src={v.variant_image_url || currentImageUrl || '/logo-vidaanimada.png'} alt={`${v.color_name} ${v.size}`} width={50} height={50} className="table-product-image" /></td>
                                            <td><div style={{display:'flex', alignItems:'center', gap:'8px'}}><span style={{width:'20px', height:'20px', backgroundColor:v.color_hex || '#fff', borderRadius:'50%', border:'1px solid #eee'}}></span>{v.color_name || '-'}</div></td>
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
                                <div className="color-swatch" onClick={() => setDisplayColorPicker(!displayColorPicker)}><div className="color-preview" style={{ background: newColorHex }} /></div>
                                {displayColorPicker ? (<div className="color-popover"><div className="color-cover" onClick={() => setDisplayColorPicker(false)} /><SketchPicker color={newColorHex} onChange={(color) => setNewColorHex(color.hex)} /></div>) : null}
                            </div>
                            <input type="text" placeholder="Talle" value={newVariantSize} onChange={e => setNewVariantSize(e.target.value)} />
                            <input type="number" placeholder="Stock" value={newVariantStock} onChange={e => setNewVariantStock(e.target.value)} required/>
                             <div className="file-input-container">
                                <label htmlFor="newVariantImageFile">Imagen Específica (Opcional)</label>
                                <input type="file" id="newVariantImageFile" accept="image/*" onChange={e => setNewVariantImageFile(e.target.files[0])} />
                                {newVariantImageFile && <p className="selected-file-name">{newVariantImageFile.name}</p>}
                            </div>
                            <button type="submit" className="btn-primary">Añadir Variante</button>
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

// --- MODAL PARA EDITAR VARIANTE ---
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
        e.preventDefault();
        setIsSaving(true);
        let finalImageUrl = currentImageUrl;

        try {
            if (imageFile) {
                const fileName = `${Date.now()}-VAR-${imageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
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
            onSave(data); // Pasa la variante actualizada de vuelta

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