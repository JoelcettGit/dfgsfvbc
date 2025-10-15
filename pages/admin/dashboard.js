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

    const [view, setView] = useState('list'); // 'list' o 'form'
    const [editingProduct, setEditingProduct] = useState(null); // Producto que se está editando

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

    // Nueva consulta para traer todos los datos anidados
    const fetchProducts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select(`*, product_colors(*, product_variants(*))`)
            .order('id', { ascending: false });

        if (error) console.error("Error al cargar productos:", error.message);
        else setProducts(data || []);
        setIsLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const handleAddNewProduct = () => {
        setEditingProduct(null); // Aseguramos que no hay un producto en edición
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
                <h1>Dashboard</h1>
                <p>Bienvenido, {user?.email}</p>
                <div>
                    <button onClick={() => router.push('/')} className="btn-secondary" style={{marginRight: '1rem'}}>Ver Tienda</button>
                    <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
                </div>
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
                        <tr><th>Nombre</th><th>Categoría</th><th>Colores</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.category}</td>
                                <td>{p.product_colors.length}</td>
                                <td><button onClick={() => onEdit(p)} className="btn-edit">Gestionar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- VISTA DE FORMULARIO PARA AGREGAR/EDITAR PRODUCTO Y VARIANTES ---
function ProductFormView({ product, onBack, onSave }) {
    // Estados para el producto padre
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || 0);
    const [tag, setTag] = useState(product?.tag || '');
    const [isSaving, setIsSaving] = useState(false);

    // Estados para los colores y variantes
    const [colors, setColors] = useState(product?.product_colors || []);
    
    // Estado para el formulario de NUEVO COLOR
    const [newColorName, setNewColorName] = useState('');
    const [newColorHex, setNewColorHex] = useState('#CCCCCC');
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [newImageFile, setNewImageFile] = useState(null);

    // Estado para el MODAL de gestión de talles
    const [managingVariantsForColor, setManagingVariantsForColor] = useState(null);

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const productData = { name, description, category, base_price: basePrice, tag };
        let currentProduct = product;

        if (!currentProduct) {
            const { data, error } = await supabase.from('products').insert(productData).select().single();
            if (error) { alert("Error al crear producto: " + error.message); setIsSaving(false); return; }
            currentProduct = data; // Ahora tenemos un producto con ID
             alert("Producto creado. Ahora puedes agregarle colores y variantes.");
        } else {
            const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id);
            if (error) { alert("Error al actualizar producto: " + error.message); setIsSaving(false); return; }
            alert("Datos generales guardados.");
        }
        
        setIsSaving(false);
        onSave(); // Refresca toda la lista de productos
    };
    
    const handleAddColor = async (e) => {
        e.preventDefault();
        if (!newImageFile) { alert("Por favor, selecciona una imagen para el color."); return; }
        
        const fileName = `${Date.now()}-${newImageFile.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newImageFile);
        if (uploadError) { alert("Error al subir imagen: " + uploadError.message); return; }

        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

        const { data, error } = await supabase.from('product_colors').insert({
            product_id: product.id,
            color_name: newColorName,
            color_hex: newColorHex,
            image_url: publicUrl,
        }).select().single();

        if (error) { alert("Error al agregar color: " + error.message); } 
        else {
            setColors([...colors, data]);
            setNewColorName(''); setNewColorHex('#CCCCCC'); setNewImageFile(null);
            document.getElementById('colorImageFile').value = '';
        }
    };

    const handleDeleteColor = async (colorId) => {
        // En una versión más avanzada, también deberíamos borrar las variantes asociadas y la imagen del storage
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
                    <input type="text" placeholder="Nombre del Producto" value={name} onChange={e => setName(e.target.value)} required />
                    <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows="3" />
                    <input type="text" placeholder="Categoría" value={category} onChange={e => setCategory(e.target.value)} required />
                    <input type="number" step="0.01" placeholder="Precio Base" value={basePrice} onChange={e => setBasePrice(e.target.value)} required />
                    <input type="text" placeholder="Etiqueta (ej: Destacado, Oferta)" value={tag} onChange={e => setTag(e.target.value)} />
                    <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar Datos Generales"}</button>
                </form>

                {product && (
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
                <VariantsModal 
                    color={managingVariantsForColor} 
                    onClose={() => setManagingVariantsForColor(null)} 
                    onSave={onSave}
                />
            )}
        </>
    );
}

// --- NUEVO COMPONENTE: MODAL PARA GESTIONAR TALLES Y STOCK ---
function VariantsModal({ color, onClose, onSave }) {
    const [variants, setVariants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estados para el formulario de NUEVO TALLE
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
        const { data, error } = await supabase.from('product_variants').insert({
            product_color_id: color.id,
            size: newSize,
            stock: newStock,
        }).select().single();

        if (error) { alert("Error al agregar talle: " + error.message); }
        else {
            setVariants([...variants, data]);
            setNewSize(''); setNewStock(0);
        }
    };

    const handleDeleteVariant = async (variantId) => {
        if (!confirm("¿Seguro que quieres eliminar este talle?")) return;
        const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
        if (error) { alert("Error al eliminar talle: " + error.message); }
        else { setVariants(variants.filter(v => v.id !== variantId)); }
    };
    
    // Al cerrar el modal, refrescamos la lista principal de productos
    const handleClose = () => {
        onSave();
        onClose();
    };

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