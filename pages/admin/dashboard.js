import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { SketchPicker } from 'react-color';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);


// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
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
            if (!session) {
                router.push('/admin/login');
            } else {
                setUser(session.user);
                await fetchProducts();
                setIsLoading(false);
            }
        };
        checkUserAndFetchProducts();
    }, [router]);

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`*, product_variants (*)`)
            .order('id', { ascending: false });

        if (error) {
            console.error("Error al cargar productos y variantes:", error.message);
        } else {
            setProducts(data || []);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const handleAddNewProduct = () => {
        setEditingProduct(null);
        setView('form');
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setView('form');
    };

    if (isLoading) {
        return <div className="loading-screen">Cargando datos del administrador...</div>;
    }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <h1>Dashboard de Vida Animada</h1>
                <p>Bienvenido, {user?.email}</p>
                <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
            </header>

            <main className="admin-main">
                {view === 'list' && (
                    <ProductListView products={products} onAddNew={handleAddNewProduct} onEdit={handleEditProduct} />
                )}
                {view === 'form' && (
                    <ProductFormView product={editingProduct} onBack={() => setView('list')} onSave={fetchProducts} />
                )}
            </main>
        </div>
    );
}

// --- VISTA DE LISTA DE PRODUCTOS ---
function ProductListView({ products, onAddNew, onEdit }) {
    return (
        <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Listado de Productos ({products.length})</h2>
                <button onClick={onAddNew} className="btn-primary">Agregar Nuevo Producto</button>
            </div>
            <div className="table-container">
                <table className="products-table">
                    <thead>
                        <tr><th>Nombre</th><th>Categoría</th><th>Etiqueta</th><th>Variantes</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{product.category}</td>
                                <td>{product.tag || '-'}</td>
                                <td>{product.product_variants.length}</td>
                                <td><button onClick={() => onEdit(product)} className="btn-edit">Gestionar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- VISTA DE FORMULARIO (ACTUALIZADA CON EDICIÓN DE VARIANTES) ---
function ProductFormView({ product, onBack, onSave }) {
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || 0);
    const [tag, setTag] = useState(product?.tag || '');
    const [variants, setVariants] = useState(product?.product_variants || []);
    const [isSaving, setIsSaving] = useState(false);

    // Estados para el formulario de NUEVA VARIANTE
    const [newVariantColorName, setNewVariantColorName] = useState('');
    const [newVariantColorHex, setNewVariantColorHex] = useState('#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [newVariantSize, setNewVariantSize] = useState('');
    const [newVariantStock, setNewVariantStock] = useState(0);
    const [newVariantImageFile, setNewVariantImageFile] = useState(null);

    // --- NUEVO: Estados para el MODAL DE EDICIÓN DE VARIANTE ---
    const [editingVariant, setEditingVariant] = useState(null); // Guarda la variante que se está editando
    const [editVariantColorName, setEditVariantColorName] = useState('');
    const [editVariantColorHex, setEditVariantColorHex] = useState('');
    const [editVariantSize, setEditVariantSize] = useState('');
    const [editVariantStock, setEditVariantStock] = useState(0);
    const [displayEditColorPicker, setDisplayEditColorPicker] = useState(false);

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const productData = { name, description, category, base_price: basePrice, tag };
        let currentProductId = product?.id;

        if (!currentProductId) {
            const { data, error } = await supabase.from('products').insert(productData).select().single();
            if (error) { alert("Error al crear el producto: " + error.message); setIsSaving(false); return; }
            currentProductId = data.id;
        } else {
            const { error } = await supabase.from('products').update(productData).eq('id', currentProductId);
            if (error) { alert("Error al actualizar el producto: " + error.message); setIsSaving(false); return; }
        }

        alert("Datos generales guardados.");
        setIsSaving(false);
        onSave();
    };

    const handleAddVariant = async (e) => {
        e.preventDefault();
        if (!newVariantImageFile) { alert("Por favor, selecciona una imagen para la variante."); return; }

        const fileName = `${Date.now()}-${newVariantImageFile.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newVariantImageFile);
        if (uploadError) { alert("Error al subir la imagen: " + uploadError.message); return; }

        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

        const { data, error } = await supabase.from('product_variants').insert({
            product_id: product.id,
            color_name: newVariantColorName,
            color_hex: newVariantColorHex,
            size: newVariantSize,
            stock: newVariantStock,
            image_url: publicUrl,
        }).select().single();

        if (error) {
            alert("Error al agregar la variante: " + error.message);
        } else {
            setVariants([...variants, data]);
            setNewVariantColorName(''); setNewVariantColorHex('#CCCCCC'); setNewVariantSize(''); setNewVariantStock(0); setNewVariantImageFile(null);
            document.getElementById('variantImageFile').value = '';
        }
    };
    // --- NUEVO: Abre el modal para editar una variante ---
    const handleEditVariantClick = (variant) => {
        setEditingVariant(variant);
        setEditVariantColorName(variant.color_name || '');
        setEditVariantColorHex(variant.color_hex || '#CCCCCC');
        setEditVariantSize(variant.size || '');
        setEditVariantStock(variant.stock || 0);
    };

    // --- NUEVO: Guarda los cambios de la variante editada ---
    const handleUpdateVariant = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from('product_variants')
            .update({
                color_name: editVariantColorName,
                color_hex: editVariantColorHex,
                size: editVariantSize,
                stock: editVariantStock
            })
            .eq('id', editingVariant.id)
            .select()
            .single();

        if (error) {
            alert("Error al actualizar la variante: " + error.message);
        } else {
            setVariants(variants.map(v => v.id === editingVariant.id ? data : v));
            setEditingVariant(null); // Cierra el modal
        }
    };
    const handleDeleteVariant = async (variantId) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta variante?")) return;
        const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
        if (error) { alert("Error al eliminar la variante: " + error.message); }
        else { setVariants(variants.filter(v => v.id !== variantId)); }
    };

    return (
        <div className="admin-section">
            <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Volver a la lista</button>
            <h2>{product ? `Gestionando: ${product.name}` : "Agregar Nuevo Producto"}</h2>

            <form onSubmit={handleSaveProduct} className="add-product-form">
                <h3>Datos Generales</h3>
                <input type="text" placeholder="Nombre del Producto" value={name} onChange={e => setName(e.target.value)} required />
                <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows="3" />
                <input type="text" placeholder="Categoría" value={category} onChange={e => setCategory(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Precio Base" value={basePrice} onChange={e => setBasePrice(e.target.value)} required />
                <input type="text" placeholder="Etiqueta (ej: Destacado, Oferta)" value={tag} onChange={e => setTag(e.target.value)} />
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar Datos Generales"}</button>
            </form>

            {product && (
                <div className="variants-section">
                    <h3>Variantes del Producto</h3>
                    <div className="table-container">
                        <table className="products-table">
                            <thead><tr><th>Imagen</th><th>Color</th><th>Talle</th><th>Stock</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {variants.map(v => (
                                    <tr key={v.id}>
                                        <td><Image src={v.image_url} alt={`${v.color_name} ${v.size}`} width={50} height={50} className="table-product-image" /></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '20px', height: '20px', backgroundColor: v.color_hex, borderRadius: '50%', border: '1px solid #eee' }}></span>
                                                {v.color_name || '-'}
                                            </div>
                                        </td>
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
                        <h4>Agregar Nueva Variante</h4>
                        <input type="text" placeholder="Nombre del Color (ej: Negro)" value={newVariantColorName} onChange={e => setNewVariantColorName(e.target.value)} />
                        <div className="color-picker-wrapper">
                            <label>Elegir Color Hex</label>
                            <div className="color-swatch" onClick={() => setDisplayColorPicker(!displayColorPicker)}>
                                <div className="color-preview" style={{ background: newVariantColorHex }} />
                            </div>
                            {displayColorPicker ? (
                                <div className="color-popover">
                                    <div className="color-cover" onClick={() => setDisplayColorPicker(false)} />
                                    <SketchPicker color={newVariantColorHex} onChange={(color) => setNewVariantColorHex(color.hex)} />
                                </div>
                            ) : null}
                        </div>
                        <input type="text" placeholder="Talle (ej: S, M, Único)" value={newVariantSize} onChange={e => setNewVariantSize(e.target.value)} />
                        <input type="number" placeholder="Stock" value={newVariantStock} onChange={e => setNewVariantStock(e.target.value)} required />
                        <input type="file" id="variantImageFile" onChange={e => setNewVariantImageFile(e.target.files[0])} required />
                        <button type="submit" className="btn-primary">Añadir Variante</button>
                    </form>
                </div>
            )}
            {editingVariant && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Editando Variante</h2>
                        <form onSubmit={handleUpdateVariant}>
                            <label>Nombre del Color</label>
                            <input type="text" value={editVariantColorName} onChange={e => setEditVariantColorName(e.target.value)} />

                            <div className="color-picker-wrapper">
                                <label>Elegir Color Hex</label>
                                <div className="color-swatch" onClick={() => setDisplayEditColorPicker(!displayEditColorPicker)}>
                                    <div className="color-preview" style={{ background: editVariantColorHex }} />
                                </div>
                                {displayEditColorPicker ? (
                                    <div className="color-popover">
                                        <div className="color-cover" onClick={() => setDisplayEditColorPicker(false)} />
                                        <SketchPicker color={editVariantColorHex} onChange={(color) => setEditVariantColorHex(color.hex)} />
                                    </div>
                                ) : null}
                            </div>

                            <label>Talle</label>
                            <input type="text" value={editVariantSize} onChange={e => setEditVariantSize(e.target.value)} />

                            <label>Stock</label>
                            <input type="number" value={editVariantStock} onChange={e => setEditVariantStock(e.target.value)} />

                            <div className="modal-actions">
                                <button type="submit" className="btn-primary">Guardar Cambios</button>
                                <button type="button" onClick={() => setEditingVariant(null)} className="btn-secondary">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}