import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { SketchPicker } from 'react-color';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

    const fetchProducts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('products').select(`*, product_colors(*, product_variants(*))`).order('id', { ascending: false });
        if (error) console.error("Error al cargar productos:", error.message);
        else setProducts(data || []);
        setIsLoading(false);
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar "${productName}" y todas sus variantes? Esta acción es permanente.`)) return;
        
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            alert("Error al eliminar el producto: " + error.message);
        } else {
            alert(`Producto "${productName}" eliminado con éxito.`);
            fetchProducts();
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const handleAddNewProduct = () => { setEditingProduct(null); setView('form'); };
    const handleEditProduct = (product) => { setEditingProduct(product); setView('form'); };

    if (isLoading) { return <div className="loading-screen">Cargando...</div>; }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <h1>Dashboard</h1>
                <p>Bienvenido, {user?.email}</p>
                <div>
                    <button onClick={() => router.push('/')} className="btn-secondary" style={{marginRight: '1rem'}}>Ver Tienda</button>
                    <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
                </div>
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
                    <thead><tr><th>Nombre</th><th>Categoría</th><th>Colores</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.category}</td>
                                <td>{p.basePrice}</td>
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
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || '');
    const [tag, setTag] = useState(product?.tag || '');
    const [isSaving, setIsSaving] = useState(false);
    
    const [productType, setProductType] = useState('variable');
    const [simpleStock, setSimpleStock] = useState(0);
    const [simpleImageFile, setSimpleImageFile] = useState(null);

    const [colors, setColors] = useState(product?.product_colors || []);
    const [newColorName, setNewColorName] = useState('');
    const [newColorHex, setNewColorHex] = useState('#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [newImageFile, setNewImageFile] = useState(null);
    const [managingVariantsForColor, setManagingVariantsForColor] = useState(null);

    // --- useEffect CORREGIDO ---
    useEffect(() => {
        if (product) {
            // Verifica si la propiedad product_colors existe y tiene al menos un elemento
            if (product.product_colors && product.product_colors.length > 0) {
                const firstColor = product.product_colors[0];
                // Verifica si la propiedad product_variants existe en el primer color
                const variantsExist = firstColor.product_variants && firstColor.product_variants.length > 0;
                
                const hasComplexVariants = product.product_colors.length > 1 || 
                                         firstColor.color_name !== 'Default' || 
                                         (variantsExist && firstColor.product_variants.some(v => v.size !== 'Único'));
                
                if (hasComplexVariants) {
                    setProductType('variable');
                } else {
                    setProductType('simple');
                    // Acceso seguro al stock
                    setSimpleStock(variantsExist ? firstColor.product_variants[0].stock : 0); 
                }
            } else {
                // Si el producto existe pero aún no tiene colores (recién creado),
                // mantenemos el tipo que ya estaba seleccionado o default ('variable')
                setProductType(prevType => prevType || 'variable');
            }
        } else {
            // Producto nuevo, por defecto es variable
            setProductType('variable');
        }
    }, [product]);

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const productData = { name, description, category, base_price: parseFloat(basePrice), tag };
        let currentProduct = product;
        let isNewProduct = !currentProduct;

        try {
            if (isNewProduct) {
                const { data, error } = await supabase.from('products').insert(productData).select().single();
                if (error) throw error;
                currentProduct = data;
                product = data; // Actualiza la prop localmente
            } else {
                const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id);
                if (error) throw error;
            }

            if (productType === 'simple') {
                if (!simpleImageFile && !currentProduct?.product_colors?.[0]?.image_url) {
                    throw new Error("Debes seleccionar una imagen para el producto simple.");
                }

                let imageUrl = currentProduct?.product_colors?.[0]?.image_url;
                if (simpleImageFile) {
                    const fileName = `${Date.now()}-${simpleImageFile.name.replace(/\s/g, '_')}`;
                    const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, simpleImageFile);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
                
                const { data: colorData, error: colorError } = await supabase.from('product_colors').upsert({
                    id: currentProduct?.product_colors?.[0]?.id,
                    product_id: currentProduct.id,
                    color_name: 'Default',
                    color_hex: '#FFFFFF',
                    image_url: imageUrl
                }, { onConflict: 'product_id, color_name' }).select().single();
                if (colorError) throw colorError;

                const { error: variantError } = await supabase.from('product_variants').upsert({
                    id: currentProduct?.product_colors?.[0]?.product_variants?.[0]?.id,
                    product_color_id: colorData.id,
                    size: 'Único',
                    stock: parseInt(simpleStock, 10)
                }, { onConflict: 'product_color_id, size' });
                if (variantError) throw variantError;
            }

            alert(isNewProduct ? "Producto creado con éxito." : "Producto actualizado con éxito.");
            onSave(); // Refresca la lista principal
            if (isNewProduct && productType === 'simple') {
                 onBack(); 
            }
            
        } catch (error) {
            console.error("Error detallado al guardar:", error);
            alert("Error al guardar el producto: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddColor = async (e) => {
        e.preventDefault();
        if (!product) { alert("Primero debes guardar los datos generales del producto."); return; }
        if (!newImageFile) { alert("Por favor, selecciona una imagen para el color."); return; }
        const fileName = `${Date.now()}-${newImageFile.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newImageFile);
        if (uploadError) { alert("Error al subir imagen: " + uploadError.message); return; }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        const { data, error } = await supabase.from('product_colors').insert({
            product_id: product.id, color_name: newColorName, color_hex: newColorHex, image_url: publicUrl
        }).select('*, product_variants(*)').single();
        if (error) { alert("Error al agregar color: " + error.message); } 
        else {
            setColors([...colors, data]);
            setNewColorName(''); setNewColorHex('#CCCCCC'); setNewImageFile(null);
            document.getElementById('colorImageFile').value = '';
        }
    };

    const handleDeleteColor = async (colorId) => {
        if (!confirm("¿Seguro que quieres eliminar este color y todos sus talles asociados?")) return;
        const { error } = await supabase.from('product_colors').delete().eq('id', colorId);
        if (error) { alert("Error al eliminar color: " + error.message); }
        else { setColors(colors.filter(c => c.id !== colorId)); }
    };

    return (
        <>
            <div className="admin-section">
                <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Volver a la lista</button>
                <h2>{product ? `Gestionando: ${product.name}` : "Agregar Nuevo Producto"}</h2>
                <form onSubmit={handleSaveProduct} className="add-product-form">
                    <h3>Datos Generales</h3>
                    <div className="checkbox-container add-form-checkbox">
                        <input type="checkbox" id="hasVariants" checked={productType === 'variable'} onChange={(e) => setProductType(e.target.checked ? 'variable' : 'simple')} />
                        <label htmlFor="hasVariants">Este producto tiene variantes (colores y/o talles)</label>
                    </div>
                    <input type="text" placeholder="Nombre del Producto" value={name} onChange={e => setName(e.target.value)} required />
                    <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows="3" />
                    <input type="text" placeholder="Categoría" value={category} onChange={e => setCategory(e.target.value)} required />
                    <input type="number" step="0.01" placeholder="Precio Base" value={basePrice} onChange={e => setBasePrice(e.target.value)} required />
                    <input type="text" placeholder="Etiqueta (ej: Destacado, Oferta)" value={tag} onChange={e => setTag(e.target.value)} />
                    
                    {productType === 'simple' && (
                        <>
                            <input type="number" placeholder="Stock" value={simpleStock} onChange={e => setSimpleStock(e.target.value)} required />
                            <div className="file-input-container">
                                <label htmlFor="simpleImageFile">Imagen del Producto</label>
                                <input type="file" id="simpleImageFile" accept="image/*" onChange={(e) => setSimpleImageFile(e.target.files[0])} />
                                {simpleImageFile && <p className="selected-file-name">{simpleImageFile.name}</p>}
                                {!simpleImageFile && product?.product_colors?.[0]?.image_url && <p className="selected-file-name">Imagen actual: <a href={product.product_colors[0].image_url} target="_blank" rel="noopener noreferrer">Ver</a></p>}
                            </div>
                        </>
                    )}

                    <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar Datos Generales"}</button>
                </form>

                {product && productType === 'variable' && (
                    <div className="variants-section">
                        <h3>Colores y Galería</h3>
                        <div className="table-container">
                            <table className="products-table">
                                <thead><tr><th>Imagen</th><th>Nombre del Color</th><th>Talles Definidos</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {colors.map(c => (
                                        <tr key={c.id}>
                                            <td><Image src={c.image_url} alt={c.color_name} width={50} height={50} className="table-product-image" /></td>
                                            <td><div style={{display:'flex', alignItems:'center', gap:'8px'}}><span style={{width:'20px', height:'20px', backgroundColor:c.color_hex, borderRadius:'50%', border:'1px solid #eee'}}></span>{c.color_name}</div></td>
                                            <td>{c.product_variants?.length || 0}</td>
                                            <td className="variant-actions">
                                                <button onClick={() => setManagingVariantsForColor(c)} className="btn-edit">Gestionar Talles</button>
                                                <button onClick={() => handleDeleteColor(c.id)} className="btn-delete">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <form onSubmit={handleAddColor} className="add-variant-form">
                            <h4>Agregar Nuevo Color</h4>
                            <input type="text" placeholder="Nombre del Color" value={newColorName} onChange={e => setNewColorName(e.target.value)} required />
                            <div className="color-picker-wrapper">
                                <label>Elegir Color Hex</label>
                                <div className="color-swatch" onClick={() => setDisplayColorPicker(!displayColorPicker)}><div className="color-preview" style={{ background: newColorHex }} /></div>
                                {displayColorPicker ? (<div className="color-popover"><div className="color-cover" onClick={() => setDisplayColorPicker(false)} /><SketchPicker color={newColorHex} onChange={(color) => setNewColorHex(color.hex)} /></div>) : null}
                            </div>
                            <input type="file" id="colorImageFile" onChange={e => setNewImageFile(e.target.files[0])} required />
                            <button type="submit" className="btn-primary">Añadir Color</button>
                        </form>
                    </div>
                )}
            </div>
            
            {managingVariantsForColor && (
                <VariantsModal color={managingVariantsForColor} onClose={() => setManagingVariantsForColor(null)} onSave={onSave} />
            )}
        </>
    );
}

// --- MODAL PARA GESTIONAR TALLES ---
function VariantsModal({ color, onClose, onSave }) {
    const [variants, setVariants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newSize, setNewSize] = useState('');
    const [newStock, setNewStock] = useState(0);

    useEffect(() => {
        const fetchVariants = async () => {
            const { data, error } = await supabase.from('product_variants').select('*').eq('product_color_id', color.id);
            if (error) console.error("Error al cargar variantes:", error.message);
            else setVariants(data || []);
            setIsLoading(false);
        };
        fetchVariants();
    }, [color.id]);

    const handleAddVariant = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.from('product_variants').insert({ product_color_id: color.id, size: newSize, stock: newStock }).select().single();
        if (error) { alert("Error al agregar talle: " + error.message); }
        else { setVariants([...variants, data]); setNewSize(''); setNewStock(0); }
    };

    const handleDeleteVariant = async (variantId) => {
        if (!confirm("¿Seguro que quieres eliminar este talle?")) return;
        const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
        if (error) { alert("Error al eliminar talle: " + error.message); }
        else { setVariants(variants.filter(v => v.id !== variantId)); }
    };
    
    const handleClose = () => { onSave(); onClose(); };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Gestionando Talles para: {color.color_name}</h2>
                {isLoading ? <p>Cargando...</p> : (
                    <>
                        <div className="table-container">
                             <table className="products-table">
                                <thead><tr><th>Talle</th><th>Stock</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {variants.map(v => (
                                        <tr key={v.id}>
                                            <td>{v.size || 'Único'}</td>
                                            <td>{v.stock} u.</td>
                                            <td><button onClick={() => handleDeleteVariant(v.id)} className="btn-delete">Eliminar</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <form onSubmit={handleAddVariant} className="add-variant-form">
                            <h4>Agregar Talle y Stock</h4>
                            <input type="text" placeholder="Talle (ej: S, M, 38)" value={newSize} onChange={e => setNewSize(e.target.value)} required/>
                            <input type="number" placeholder="Stock" value={newStock} onChange={e => setNewStock(e.target.value)} required/>
                            <button type="submit" className="btn-primary">Añadir Talle</button>
                        </form>
                    </>
                )}
                <div className="modal-actions">
                    <button type="button" onClick={handleClose} className="btn-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );
}