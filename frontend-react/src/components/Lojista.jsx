import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../Services/api';

const Lojista = ({ user, onLogout }) => {
    const [viewMode, setViewMode] = useState('gestao');
    const [activeTab, setActiveTab] = useState('corredores'); // 'corredores', 'produtos', 'layout'
    
    const [corredores, setCorredores] = useState([]);
    const [prateleiras, setPrateleiras] = useState([]);
    const [produtos, setProdutos] = useState([]);
    
    const DEFAULT_MAP = 'https://via.placeholder.com/800x600?text=Carrega+o+teu+mapa+aqui';
    const [mapaUrl, setMapaUrl] = useState(DEFAULT_MAP);

    // Estados
    const [tempPin, setTempPin] = useState(null);
    const [novaPrateleira, setNovaPrateleira] = useState({ nome: '', idCorredor: '' });
    const [isDragging, setIsDragging] = useState(null);
    const mapRef = useRef(null);

    const [novoProduto, setNovoProduto] = useState({ nome: '', descricao: '', preco: '', idPrateleira: '' });
    const [novoCorredor, setNovoCorredor] = useState('');
    
    // Busca Cliente
    const [busca, setBusca] = useState('');
    const [produtoEncontrado, setProdutoEncontrado] = useState(null);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        carregarTudo();
        const savedMap = localStorage.getItem('storeMapImage');
        if (savedMap) setMapaUrl(savedMap);
    }, []);

    const showNotify = (type, text) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 3000);
    };

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
        } catch (error) {
            console.error(error);
        }
    };

    // --- LÓGICA DE MAPA (Drag & Drop) ---
    const handleMouseDown = (e, prateleiraId) => {
        if (viewMode === 'cliente') return;
        e.stopPropagation();
        setIsDragging(prateleiraId);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPrateleiras(prev => prev.map(p => p.id === isDragging ? { ...p, posX: x, posY: y } : p));
    };

    const handleMouseUp = async () => {
        if (isDragging) {
            const shelf = prateleiras.find(p => p.id === isDragging);
            if (shelf) {
                try {
                    await apiService.updatePrateleira(shelf.id, { posX: shelf.posX, posY: shelf.posY });
                    showNotify('success', 'Posição salva!');
                } catch (error) { showNotify('error', 'Erro ao salvar posição.'); }
            }
            setIsDragging(null);
        }
    };

    const handleMapClick = (e) => {
        if (viewMode === 'cliente' || isDragging) return;
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setTempPin({ x, y });
        setNovaPrateleira({ nome: '', idCorredor: '' });
    };

    // --- AÇÕES CRUD ---
    const handleAddCorredor = async (e) => {
        e.preventDefault();
        await apiService.createCorredor({ nome: novoCorredor });
        setNovoCorredor(''); carregarTudo();
        showNotify('success', 'Corredor criado!');
    };

    const handleAddProduto = async (e) => {
        e.preventDefault();
        try {
            const { nome, descricao, preco, idPrateleira } = novoProduto;
            const shelfObj = prateleiras.find(p => p.id == idPrateleira);
            
            // Debug: ver o que estamos a enviar no browser
            console.log("A enviar Produto:", {
                nome, 
                descricao, 
                preco: parseFloat(preco),
                idPrateleira: parseInt(idPrateleira),
                idCorredor: shelfObj ? (shelfObj.idCorredor || shelfObj.corredorId) : null
            });

            await apiService.createProduct({
                nome, 
                descricao, 
                preco: parseFloat(preco),
                // CORREÇÃO FINAL: Usar os nomes exatos do Java
                idPrateleira: parseInt(idPrateleira), 
                idCorredor: shelfObj ? (shelfObj.idCorredor || shelfObj.corredorId) : null 
            });

            setNovoProduto({ nome: '', descricao: '', preco: '', idPrateleira: '' });
            carregarTudo();
            showNotify('success', 'Produto criado com localização!');
        } catch(e) { 
            console.error(e);
            showNotify('error', 'Erro ao criar produto.'); 
        }
    };

    const handleSalvarPrateleiraVisual = async (e) => {
        e.preventDefault();
        if (!novaPrateleira.idCorredor) return alert("Selecione um corredor!");
        try {
            await apiService.createPrateleira({
                name: novaPrateleira.nome,
                corredorId: parseInt(novaPrateleira.idCorredor),
                posX: tempPin.x, posY: tempPin.y
            });
            setTempPin(null); carregarTudo();
        } catch (err) { showNotify('error', 'Erro ao criar prateleira.'); }
    };

    const handleDelete = async (type, id) => {
        if(!confirm("Tem a certeza?")) return;
        if(type === 'prod') await apiService.deleteProduct(id);
        if(type === 'corr') await apiService.deleteCorredor(id);
        if(type === 'prat') await apiService.deletePrateleira(id);
        carregarTudo();
    };

    const handleMapUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            setMapaUrl(evt.target.result);
            localStorage.setItem('storeMapImage', evt.target.result);
        };
        reader.readAsDataURL(file);
    };

    // --- MODO CLIENTE: PESQUISA ---
    const handleClienteSearch = (e) => {
        e.preventDefault();
        // 1. Procura o produto pelo nome
        const found = produtos.find(p => (p.name||p.nome||'').toLowerCase().includes(busca.toLowerCase()));
        
        if(found) {
            // 2. Tenta encontrar a prateleira usando o ID guardado no produto (shelfId)
            // Backend deve retornar 'shelfId' no DTO de produtos
            const shelfId = found.shelfId || found.idPrateleira; 
            const shelf = prateleiras.find(pr => pr.id === shelfId);

            if(shelf) {
                setProdutoEncontrado({
                    ...found, 
                    shelfX: shelf.posX, 
                    shelfY: shelf.posY, 
                    shelfName: shelf.name
                });
                showNotify('success', `Encontrado na prateleira: ${shelf.name}`);
            } else {
                setProdutoEncontrado(found);
                showNotify('warning', 'Produto encontrado, mas a prateleira não está no mapa.');
            }
        } else {
            setProdutoEncontrado(null);
            showNotify('error', 'Produto não encontrado.');
        }
    };

    return (
        <div className="dashboard-wrapper" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
            {notification && <div className={`notification-toast ${notification.type}`}>{notification.text}</div>}
            
            <header className="glass-header">
                <h1>Supermarket {viewMode === 'gestao' ? 'Manager' : 'Finder'}</h1>
                <div className="controls">
                    <button className="btn-primary" onClick={() => setViewMode(viewMode==='gestao'?'cliente':'gestao')}>
                        {viewMode==='gestao' ? 'Modo Cliente' : 'Modo Gestão'}
                    </button>
                    <button className="btn-icon" onClick={onLogout}>🚪</button>
                </div>
            </header>

            {viewMode === 'gestao' ? (
                /* --- LAYOUT GESTÃO --- */
                <div style={{display:'flex', height:'calc(100vh - 80px)'}}>
                    
                    {/* ESQUERDA: CRIAÇÃO (SIDEBAR) */}
                    <aside style={{width:'320px', background:'white', padding:'20px', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column', gap:'20px'}}>
                        <div style={{display:'flex', gap:'5px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                            <button className={`tab-btn ${activeTab==='corredores'?'active':''}`} onClick={()=>setActiveTab('corredores')}>Corredores</button>
                            <button className={`tab-btn ${activeTab==='produtos'?'active':''}`} onClick={()=>setActiveTab('produtos')}>Produtos</button>
                            <button className={`tab-btn ${activeTab==='layout'?'active':''}`} onClick={()=>setActiveTab('layout')}>Mapa</button>
                        </div>

                        {/* FORMULÁRIO DE CORREDOR */}
                        {activeTab === 'corredores' && (
                            <div className="animate-fade">
                                <h4>Novo Corredor</h4>
                                <form onSubmit={handleAddCorredor} className="floating-form">
                                    <input value={novoCorredor} onChange={e=>setNovoCorredor(e.target.value)} placeholder="Nome do Corredor" required />
                                    <button className="btn-primary">Criar</button>
                                </form>
                            </div>
                        )}

                        {/* FORMULÁRIO DE PRODUTO */}
                        {activeTab === 'produtos' && (
                            <div className="animate-fade">
                                <h4>Novo Produto</h4>
                                <form onSubmit={handleAddProduto} className="floating-form">
                                    <input value={novoProduto.nome} onChange={e=>setNovoProduto({...novoProduto, nome:e.target.value})} placeholder="Nome" required/>
                                    <input value={novoProduto.descricao} onChange={e=>setNovoProduto({...novoProduto, descricao:e.target.value})} placeholder="Descrição" required/>
                                    <input value={novoProduto.preco} onChange={e=>setNovoProduto({...novoProduto, preco:e.target.value})} placeholder="Preço" type="number" required/>
                                    <select value={novoProduto.idPrateleira} onChange={e=>setNovoProduto({...novoProduto, idPrateleira:e.target.value})} required>
                                        <option value="">Prateleira...</option>
                                        {prateleiras.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button className="btn-primary">Salvar Produto</button>
                                </form>
                            </div>
                        )}

                        {/* FORMULÁRIO DE MAPA */}
                        {activeTab === 'layout' && (
                            <div className="animate-fade">
                                <h4>Configurar Mapa</h4>
                                <input type="file" onChange={handleMapUpload} accept="image/*" />
                                <p style={{fontSize:'0.8em', color:'#666', marginTop:'10px'}}>
                                    1. Carrega a imagem.<br/>
                                    2. Clica no mapa (à direita) para criar prateleiras.<br/>
                                    3. Arrasta os pins para ajustar.
                                </p>
                            </div>
                        )}
                    </aside>

                    {/* DIREITA: LISTAS E VISUALIZAÇÃO (MAIN) */}
                    <main style={{flex:1, background:'#f4f4f5', padding:'30px', overflowY:'auto'}}>
                        
                        {/* LISTA DE CORREDORES */}
                        {activeTab === 'corredores' && (
                            <div className="animate-fade">
                                <h2>Lista de Corredores</h2>
                                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'15px'}}>
                                    {corredores.map(c => (
                                        <div key={c.id} className="glass-card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <strong>{c.name || c.nome}</strong>
                                            <button onClick={()=>handleDelete('corr', c.id)} className="btn-icon" style={{color:'red'}}>🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* LISTA DE PRODUTOS */}
                        {activeTab === 'produtos' && (
                            <div className="animate-fade">
                                <h2>Lista de Produtos</h2>
                                <table style={{width:'100%', borderCollapse:'collapse', background:'white', borderRadius:'8px', overflow:'hidden'}}>
                                    <thead>
                                        <tr style={{background:'#eee', textAlign:'left'}}>
                                            <th style={{padding:'10px'}}>Nome</th>
                                            <th style={{padding:'10px'}}>Preço</th>
                                            <th style={{padding:'10px'}}>Localização</th>
                                            <th style={{padding:'10px'}}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {produtos.map(p => {
                                            const shelf = prateleiras.find(s => s.id === (p.shelfId || p.idPrateleira));
                                            return (
                                                <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                                                    <td style={{padding:'10px'}}><b>{p.name||p.nome}</b><br/><small>{p.descricao}</small></td>
                                                    <td style={{padding:'10px'}}>{p.preco}€</td>
                                                    <td style={{padding:'10px'}}>{shelf ? `📍 ${shelf.name}` : 'Sem local'}</td>
                                                    <td style={{padding:'10px'}}>
                                                        <button onClick={()=>handleDelete('prod', p.id)} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}>🗑️</button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* MAPA INTERATIVO */}
                        {activeTab === 'layout' && (
                            <div style={{textAlign:'center', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                                <div ref={mapRef} style={{position:'relative', display:'inline-block', border:'2px solid #ccc', background:'white', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}}>
                                    <img src={mapaUrl} onClick={handleMapClick} style={{maxHeight:'80vh', maxWidth:'100%', display:'block', cursor: 'crosshair'}} draggable="false" />
                                    
                                    {/* Pins */}
                                    {prateleiras.map(p => {
                                        if (p.posX === null || p.posX === undefined) return null;
                                        return (
                                            <div key={p.id}
                                                 onMouseDown={(e) => handleMouseDown(e, p.id)}
                                                 style={{
                                                     position:'absolute', 
                                                     left:`${p.posX}%`, top:`${p.posY}%`,
                                                     transform:'translate(-50%, -100%)',
                                                     cursor: isDragging === p.id ? 'grabbing' : 'grab',
                                                     zIndex: isDragging === p.id ? 100 : 10
                                                 }}>
                                                <div style={{fontSize:'2rem', lineHeight:1}}>📍</div>
                                                <div style={{background:'rgba(255,255,255,0.9)', padding:'2px 5px', fontSize:'0.7rem', borderRadius:'4px', fontWeight:'bold', border:'1px solid #ccc', textAlign:'center', marginTop:'-5px', whiteSpace:'nowrap'}}>
                                                    {p.name} <span onClick={(e)=>{e.stopPropagation(); handleDelete('prat', p.id)}} style={{color:'red', cursor:'pointer'}}>×</span>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Modal de Criação no Mapa */}
                                    {tempPin && (
                                        <div style={{position:'absolute', left:`${tempPin.x}%`, top:`${tempPin.y}%`, background:'white', padding:'10px', borderRadius:'8px', boxShadow:'0 5px 15px rgba(0,0,0,0.2)', zIndex:200, width:'200px', textAlign:'left'}}>
                                            <h5>Nova Prateleira</h5>
                                            <form onSubmit={handleSalvarPrateleiraVisual}>
                                                <input value={novaPrateleira.nome} onChange={e=>setNovaPrateleira({...novaPrateleira, nome:e.target.value})} placeholder="Nome" autoFocus style={{width:'100%', marginBottom:'5px'}}/>
                                                <select value={novaPrateleira.idCorredor} onChange={e=>setNovaPrateleira({...novaPrateleira, idCorredor:e.target.value})} style={{width:'100%', marginBottom:'5px'}}>
                                                    <option value="">Corredor...</option>
                                                    {corredores.map(c=><option key={c.id} value={c.id}>{c.name||c.nome}</option>)}
                                                </select>
                                                <button className="btn-primary btn-small">Salvar</button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            ) : (
                /* --- VISÃO CLIENTE --- */
                <div style={{padding:'20px', maxWidth:'1200px', margin:'0 auto'}}>
                    <div style={{textAlign:'center', marginBottom:'30px'}}>
                        <h2>O que procura hoje?</h2>
                        <form onSubmit={handleClienteSearch} style={{display:'inline-flex', gap:'10px'}}>
                            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar produto..." style={{padding:'10px', width:'300px', fontSize:'1.1rem'}} />
                            <button className="btn-primary">🔍</button>
                        </form>
                    </div>

                    <div style={{position:'relative', border:'2px solid #ddd', borderRadius:'12px', overflow:'hidden', background:'white'}}>
                        <img src={mapaUrl} style={{width:'100%', display:'block'}} />
                        
                        {/* Pin do Produto Encontrado */}
                        {produtoEncontrado && produtoEncontrado.shelfX && (
                            <div className="pin" style={{
                                position: 'absolute',
                                left: `${produtoEncontrado.shelfX}%`,
                                top: `${produtoEncontrado.shelfY}%`,
                                transform: 'translate(-50%, -100%)',
                                animation: 'bounce 1s infinite',
                                zIndex: 50
                            }}>
                                <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 5px 5px rgba(0,0,0,0.3))' }}>📍</div>
                                <div style={{ background: 'white', padding: '10px', borderRadius: '8px', boxShadow:'0 4px 15px rgba(0,0,0,0.3)', minWidth:'180px', border: '2px solid #ec4899', textAlign: 'left' }}>
                                    <strong style={{color:'#ec4899', fontSize:'1.1rem'}}>{produtoEncontrado.name||produtoEncontrado.nome}</strong><br/>
                                    <span style={{color:'#555'}}>Prateleira: {produtoEncontrado.shelfName}</span><br/>
                                    <span style={{color:'green', fontWeight:'bold', fontSize:'1.2rem'}}>{produtoEncontrado.preco}€</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lojista;