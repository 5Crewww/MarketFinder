import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../Services/api';

const Lojista = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('corredores');
    const [corredores, setCorredores] = useState([]);
    const [prateleiras, setPrateleiras] = useState([]);
    const [produtos, setProdutos] = useState([]);
    
    // Mapa
    const DEFAULT_MAP = 'https://via.placeholder.com/800x600?text=Carrega+o+teu+mapa+aqui';
    const [mapaUrl, setMapaUrl] = useState(DEFAULT_MAP);
    const mapRef = useRef(null);
    const [tempPin, setTempPin] = useState(null);
    const [isDragging, setIsDragging] = useState(null);

    // Forms
    const [novoCorredor, setNovoCorredor] = useState('');
    const [novaPrateleira, setNovaPrateleira] = useState({ nome: '', idCorredor: '' });
    const [novoProduto, setNovoProduto] = useState({ nome: '', descricao: '', preco: '', idPrateleira: '' });
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        carregarTudo();
        const savedMap = localStorage.getItem('storeMapImage');
        if (savedMap) setMapaUrl(savedMap);
    }, []);

    const carregarTudo = async () => {
        try {
            const [c, p, prod] = await Promise.all([
                apiService.getCorredores(),
                apiService.getPrateleiras(),
                apiService.getProducts()
            ]);
            setCorredores(Array.isArray(c) ? c : []);
            setPrateleiras(Array.isArray(p) ? p : []);
            setProdutos(Array.isArray(prod) ? prod : []);
        } catch (error) { console.error(error); }
    };

    const showNotify = (type, text) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- MAPA LÓGICA ---
    const handleMouseDown = (e, id) => { e.stopPropagation(); setIsDragging(id); };
    const handleMouseMove = (e) => {
        if (!isDragging || !mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPrateleiras(prev => prev.map(p => p.id === isDragging ? { ...p, posX: x, posY: y } : p));
    };
    const handleMouseUp = async () => {
        if (isDragging) {
            const s = prateleiras.find(p => p.id === isDragging);
            if(s) await apiService.updatePrateleira(s.id, { posX: s.posX, posY: s.posY });
            setIsDragging(null);
        }
    };
    const handleMapClick = (e) => {
        if (isDragging) return;
        const rect = e.target.getBoundingClientRect();
        setTempPin({ x: ((e.clientX - rect.left)/rect.width)*100, y: ((e.clientY - rect.top)/rect.height)*100 });
        setNovaPrateleira({ nome: '', idCorredor: '' });
    };
    const handleMapUpload = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => { setMapaUrl(evt.target.result); localStorage.setItem('storeMapImage', evt.target.result); };
        reader.readAsDataURL(file);
    };

    // --- AÇÕES ---
    const handleAddCorredor = async (e) => {
        e.preventDefault();
        await apiService.createCorredor({ nome: novoCorredor });
        setNovoCorredor(''); carregarTudo(); showNotify('success', 'Corredor Criado');
    };
    const handleAddProduto = async (e) => {
        e.preventDefault();
        const shelf = prateleiras.find(p => p.id == novoProduto.idPrateleira);
        await apiService.createProduct({ ...novoProduto, preco: parseFloat(novoProduto.preco), idPrateleira: parseInt(novoProduto.idPrateleira), idCorredor: shelf?.idCorredor });
        setNovoProduto({ nome: '', descricao: '', preco: '', idPrateleira: '' }); carregarTudo(); showNotify('success', 'Produto Criado');
    };
    const handleSalvarPrateleira = async (e) => {
        e.preventDefault();
        await apiService.createPrateleira({ name: novaPrateleira.nome, corredorId: parseInt(novaPrateleira.idCorredor), posX: tempPin.x, posY: tempPin.y });
        setTempPin(null); carregarTudo();
    };
    const handleDelete = async (type, id) => {
        if(!confirm("Apagar?")) return;
        if(type==='prod') await apiService.deleteProduct(id);
        if(type==='corr') await apiService.deleteCorredor(id);
        if(type==='prat') await apiService.deletePrateleira(id);
        carregarTudo();
    };

    return (
        <div className="dashboard-wrapper" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
            {notification && <div className="notification-toast">{notification.text}</div>}
            
            <header className="glass-header">
                <div>
                    <h1>Gestão de Loja</h1>
                    <span style={{fontSize:'0.85rem', color:'var(--text-secondary)'}}>Painel Administrativo</span>
                </div>
                <button onClick={onLogout} className="btn-logout">Sair</button>
            </header>

            <div className="app-body">
                {/* SIDEBAR */}
                <aside className="sidebar">
                    <div className="glass-tabs">
                        <button onClick={()=>setActiveTab('corredores')} className={`tab-btn ${activeTab==='corredores'?'active':''}`}>Corredores</button>
                        <button onClick={()=>setActiveTab('produtos')} className={`tab-btn ${activeTab==='produtos'?'active':''}`}>Produtos</button>
                        <button onClick={()=>setActiveTab('layout')} className={`tab-btn ${activeTab==='layout'?'active':''}`}>Mapa</button>
                    </div>

                    <div className="form-container">
                        {activeTab === 'corredores' && (
                            <>
                                <h3 style={{marginBottom:'10px', fontSize:'1rem'}}>Novo Corredor</h3>
                                <form onSubmit={handleAddCorredor}>
                                    <input placeholder="Nome Corredor" value={novoCorredor} onChange={e=>setNovoCorredor(e.target.value)} required />
                                    <button className="btn-primary">Criar</button>
                                </form>
                            </>
                        )}
                        {activeTab === 'produtos' && (
                            <>
                                <h3 style={{marginBottom:'10px', fontSize:'1rem'}}>Novo Produto</h3>
                                <form onSubmit={handleAddProduto}>
                                    <input placeholder="Nome" value={novoProduto.nome} onChange={e=>setNovoProduto({...novoProduto, nome:e.target.value})} required />
                                    <input placeholder="Descrição" value={novoProduto.descricao} onChange={e=>setNovoProduto({...novoProduto, descricao:e.target.value})} required />
                                    <input placeholder="Preço (€)" type="number" step="0.01" value={novoProduto.preco} onChange={e=>setNovoProduto({...novoProduto, preco:e.target.value})} required />
                                    <select value={novoProduto.idPrateleira} onChange={e=>setNovoProduto({...novoProduto, idPrateleira:e.target.value})} required>
                                        <option value="">Escolher Prateleira...</option>
                                        {prateleiras.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button className="btn-primary">Salvar</button>
                                </form>
                            </>
                        )}
                        {activeTab === 'layout' && (
                            <>
                                <h3 style={{marginBottom:'10px', fontSize:'1rem'}}>Imagem do Mapa</h3>
                                <input type="file" onChange={handleMapUpload} accept="image/*" />
                                <p style={{fontSize:'0.8rem', color:'var(--text-secondary)', marginTop:'10px'}}>
                                    Carregue a planta da loja e clique no mapa à direita para adicionar prateleiras.
                                </p>
                            </>
                        )}
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="main-content">
                    {/* Conteúdo scrollável com padding */}
                    <div style={{padding:'30px'}}>
                        {activeTab === 'corredores' && (
                            <div>
                                <h2 style={{marginBottom:'20px'}}>Lista de Corredores</h2>
                                {corredores.map(c => (
                                    <div key={c.id} className="list-item">
                                        <strong>{c.name||c.nome}</strong> 
                                        <button onClick={()=>handleDelete('corr', c.id)} className="btn-delete">🗑️</button>
                                    </div>
                                ))}
                                {corredores.length === 0 && <p style={{color:'#999'}}>Nenhum corredor criado.</p>}
                            </div>
                        )}

                        {activeTab === 'produtos' && (
                            <div>
                                <h2 style={{marginBottom:'20px'}}>Lista de Produtos</h2>
                                {produtos.map(p => {
                                    const shelf = prateleiras.find(s => s.id === (p.shelfId || p.idPrateleira));
                                    return (
                                        <div key={p.id} className="list-item">
                                            <div>
                                                <strong>{p.name||p.nome}</strong>
                                                <div style={{fontSize:'0.85rem', color:'var(--text-secondary)'}}>
                                                    {p.descricao} • {p.preco}€ • {shelf ? `📍 ${shelf.name}` : 'Sem local'}
                                                </div>
                                            </div>
                                            <button onClick={()=>handleDelete('prod', p.id)} className="btn-delete">🗑️</button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* MAPA FULL SIZE (Sem Padding) */}
                    {activeTab === 'layout' && (
                        <div className="map-container">
                            <div ref={mapRef} className="map-frame">
                                <img src={mapaUrl} onClick={handleMapClick} style={{maxHeight:'80vh', display:'block', cursor:'crosshair'}} draggable="false"/>
                                
                                {prateleiras.map(p => p.posX!=null && (
                                    <div key={p.id} onMouseDown={(e)=>handleMouseDown(e, p.id)} style={{position:'absolute', left:`${p.posX}%`, top:`${p.posY}%`, transform:'translate(-50%, -100%)', cursor:'grab', zIndex:10}}>
                                        <div style={{fontSize:'2rem', lineHeight:1, filter:'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'}}>📍</div>
                                        <div style={{background:'white', padding:'2px 6px', fontSize:'0.75rem', borderRadius:'4px', fontWeight:'bold', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', textAlign:'center', marginTop:'-5px', border:'1px solid #ccc', whiteSpace:'nowrap'}}>
                                            {p.name} <span onClick={(e)=>{e.stopPropagation();handleDelete('prat',p.id)}} style={{color:'red', cursor:'pointer', marginLeft:'4px'}}>×</span>
                                        </div>
                                    </div>
                                ))}
                                
                                {tempPin && (
                                    <div style={{position:'absolute', left:`${tempPin.x}%`, top:`${tempPin.y}%`, background:'white', padding:'15px', borderRadius:'8px', boxShadow:'0 10px 25px rgba(0,0,0,0.2)', zIndex:100, width:'200px'}}>
                                        <h4 style={{marginTop:0}}>Nova Prateleira</h4>
                                        <form onSubmit={handleSalvarPrateleira}>
                                            <input placeholder="Nome (ex: A1)" value={novaPrateleira.nome} onChange={e=>setNovaPrateleira({...novaPrateleira, nome:e.target.value})} autoFocus />
                                            <select value={novaPrateleira.idCorredor} onChange={e=>setNovaPrateleira({...novaPrateleira, idCorredor:e.target.value})}>
                                                <option value="">Corredor...</option>
                                                {corredores.map(c=><option key={c.id} value={c.id}>{c.name||c.nome}</option>)}
                                            </select>
                                            <div style={{display:'flex', gap:'5px'}}>
                                                <button className="btn-primary">Salvar</button>
                                                <button type="button" onClick={()=>setTempPin(null)} style={{background:'#f1f5f9', border:'none', padding:'10px', borderRadius:'6px', cursor:'pointer'}}>Cancelar</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
export default Lojista;