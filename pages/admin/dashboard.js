import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

// Cliente de Supabase para todas las operaciones
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // --- Estados para el formulario de "Agregar Producto" ---
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newStock, setNewStock] = useState('');
    const [newIsFeatured, setNewIsFeatured] = useState(false);
    const [newImageFile, setNewImageFile] = useState(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false); // Para el botón de agregar

    // --- Estados para el formulario de "Editar Producto" ---
    const [editingProduct, setEditingProduct] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editImageUrl, setEditImageUrl] = useState(''); // Guarda la URL actual
    const [editImageFile, setEditImageFile] = useState(null); // NUEVO: para la nueva imagen en edición
    const [editStock, setEditStock] = useState(0);
    const [editIsFeatured, setEditIsFeatured] = useState(false);
    const [isUpdatingProduct, setIsUpdatingProduct] = useState(false); // Para el botón de edición

    // Lógica para cargar usuario y productos
    useEffect(() => {
        const checkUserAndFetchProducts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/admin/login');
            } else {
                setUser(session.user);
                
                const { data: fetchedProducts, error } = await supabase
                    .from('products')
                    .select('*')
                    .order('id', { ascending: false });

                if (error) {
                    console.error("Error al cargar productos:", error.message);
                } else {
                    setProducts(fetchedProducts || []);
                }
                setIsLoading(false);
            }
        };
        checkUserAndFetchProducts();
    }, [router]);
    
    // Guarda el archivo seleccionado para AGREGAR producto
    const handleNewFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setNewImageFile(e.target.files[0]);
        }
    };

    // Guarda el archivo seleccionado para EDITAR producto
    const handleEditFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setEditImageFile(e.target.files[0]);
        }
    };

    // Lógica para AGREGAR productos, con subida de imagen
    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!newImageFile) {
            alert("Por favor, selecciona una imagen para el producto.");
            return;
        }
        setIsAddingProduct(true);

        try {
            const fileName = `${Date.now()}-${newImageFile.name.replace(/\s/g, '_')}`;
            
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, newImageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
            
            const { data, error: insertError } = await supabase.from('products').insert([{
                name: newName,
                price: parseFloat(newPrice),
                category: newCategory.toLowerCase(),
                image_url: publicUrl,
                stock: parseInt(newStock, 10),
                is_featured: newIsFeatured
            }]).select();

            if (insertError) throw insertError;

            if (data) {
                setProducts([data[0], ...products]);
                setNewName(''); setNewPrice(''); setNewCategory(''); setNewStock('');
                setNewIsFeatured(false); setNewImageFile(null);
                document.getElementById('newImageFile').value = '';
            }
        } catch (error) {
            alert('Error al agregar producto: ' + error.message);
        } finally {
            setIsAddingProduct(false);
        }
    };
    
    // --- Lógica para EDITAR productos ---
    const handleEditClick = (product) => {
        setEditingProduct(product);
        setEditName(product.name);
        setEditPrice(product.price);
        setEditCategory(product.category);
        setEditImageUrl(product.image_url); // Guarda la URL actual
        setEditImageFile(null); // Resetea el archivo de imagen para la edición
        setEditStock(product.stock);
        setEditIsFeatured(product.is_featured);
    };
    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        setIsUpdatingProduct(true);
        let finalImageUrl = editImageUrl; // Por defecto, usamos la URL existente

        try {
            // Si se seleccionó una nueva imagen para editar, la subimos
            if (editImageFile) {
                // Opcional: Eliminar la imagen anterior de Supabase Storage
                // (Requiere saber el nombre del archivo de la URL anterior)
                // Esto es más avanzado y lo podemos añadir después si quieres.
                
                const fileName = `${Date.now()}-${editImageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, editImageFile);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);
                finalImageUrl = publicUrl; // Actualiza la URL final
            }

            // Actualizamos el producto en la base de datos
            const { data, error: updateError } = await supabase.from('products').update({
                name: editName,
                price: parseFloat(editPrice),
                category: editCategory.toLowerCase(),
                image_url: finalImageUrl, // Usa la nueva URL o la existente
                stock: parseInt(editStock, 10),
                is_featured: editIsFeatured
            }).eq('id', editingProduct.id).select();

            if (updateError) throw updateError;

            if (data) {
                setProducts(products.map(p => (p.id === editingProduct.id ? data[0] : p)));
                setEditingProduct(null); // Cierra el modal
                setEditImageFile(null); // Limpia el archivo seleccionado
            }
        } catch (error) {
            alert('Error al actualizar el producto: ' + error.message);
        } finally {
            setIsUpdatingProduct(false);
        }
    };

    // --- NUEVA LÓGICA para ELIMINAR productos ---
    const handleDeleteProduct = async (productId, productName) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${productName}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            // Opcional: Eliminar la imagen del Storage de Supabase
            // Esto es más complejo porque requiere extraer el nombre del archivo de la URL.
            // Por ahora, solo eliminamos el registro de la base de datos.
            
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            setProducts(products.filter(p => p.id !== productId)); // Actualiza la lista en el frontend
            alert(`Producto "${productName}" eliminado con éxito.`);
        } catch (error) {
            alert('Error al eliminar el producto: ' + error.message);
        }
    };
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    if (isLoading) {
        return <div className="loading-screen">Cargando datos del administrador...</div>;
    }

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <>
            <div className="admin-dashboard">
                <header className="admin-header">
                    <h1>Dashboard de Vida Animada</h1>
                    <p>Bienvenido, {user?.email}</p>
                    <button onClick={() => router.push('/')} className="btn-secondary">Ver Tienda</button>
                    <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
                </header>
                <main className="admin-main">
                    <div className="admin-section">
                        <h2>Agregar Nuevo Producto</h2>
                        <form onSubmit={handleAddProduct} className="add-product-form">
                            <input type="text" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                            <input type="number" step="0.01" placeholder="Precio" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
                            <input type="text" placeholder="Categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required />
                            
                            <div className="file-input-container">
                                <label htmlFor="newImageFile">Imagen del Producto</label>
                                <input 
                                    type="file" 
                                    id="newImageFile"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleNewFileChange}
                                    required 
                                />
                                {newImageFile && <p className="selected-file-name">Archivo seleccionado: {newImageFile.name}</p>}
                            </div>
                            
                            <input type="number" placeholder="Stock Inicial" value={newStock} onChange={(e) => setNewStock(e.target.value)} required />
                            <div className="checkbox-container add-form-checkbox">
                                <input type="checkbox" id="newIsFeatured" checked={newIsFeatured} onChange={(e) => setNewIsFeatured(e.target.checked)} />
                                <label htmlFor="newIsFeatured">Marcar como producto destacado</label>
                            </div>
                            
                            <button type="submit" className="btn-primary" disabled={isAddingProduct}>
                                {isAddingProduct ? 'Subiendo y Agregando...' : 'Agregar Producto'}
                            </button>
                        </form>
                    </div>
                    <div className="admin-section">
                        <h2>Listado de Productos ({products.length})</h2>
                        <div className="table-container">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Imagen</th>
                                        <th>Nombre</th>
                                        <th>Categoría</th>
                                        <th>Precio</th>
                                        <th>Stock</th>
                                        <th>Destacado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id}>
                                            <td>
                                                <img src={product.image_url} alt={product.name} className="table-product-image" />
                                            </td>
                                            <td>{product.name || 'Sin nombre'}</td>
                                            <td>{product.category || 'Sin categoría'}</td>
                                            <td>${product.price}</td>
                                            <td>{product.stock} unidades</td>
                                            <td>{product.is_featured ? 'Sí' : 'No'}</td>
                                            <td>
                                                <button onClick={() => handleEditClick(product)} className="btn-edit">Editar</button>
                                                <button onClick={() => handleDeleteProduct(product.id, product.name)} className="btn-delete">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal de Edición */}
            {editingProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Editando: {editingProduct.name}</h2>
                        <form onSubmit={handleUpdateProduct}>
                            <label>Nombre</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            <label>Precio</label><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                            <label>Categoría</label><input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                            
                            {/* NUEVO: Campo para cambiar la imagen */}
                            <div className="file-input-container">
                                <label htmlFor="editImageFile">Cambiar Imagen del Producto</label>
                                <input 
                                    type="file" 
                                    id="editImageFile"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleEditFileChange}
                                />
                                {editImageFile ? (
                                    <p className="selected-file-name">Nuevo archivo: {editImageFile.name}</p>
                                ) : (
                                    <p className="selected-file-name">Imagen actual: <a href={editImageUrl} target="_blank" rel="noopener noreferrer">Ver</a></p>
                                )}
                            </div>

                            <label>Stock</label><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                            <div className="checkbox-container">
                                <input type="checkbox" id="isFeatured" checked={editIsFeatured} onChange={(e) => setEditIsFeatured(e.target.checked)} />
                                <label htmlFor="isFeatured">Marcar como producto destacado</label>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary" disabled={isUpdatingProduct}>
                                    {isUpdatingProduct ? 'Guardando Cambios...' : 'Guardar Cambios'}
                                </button>
                                <button type="button" onClick={() => setEditingProduct(null)} className="btn-secondary">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}