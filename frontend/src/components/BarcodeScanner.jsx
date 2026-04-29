import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useZxing } from 'react-zxing';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import { apiService } from '../shared/services/api';
import styles from './BarcodeScanner.module.css';

// ─────────────────────────────────────────────────────────────────
//  MÁQUINA DE ESTADOS
//
//  'idle'     → Ecrã inicial. Botão gigante "INICIAR LEITURA".
//  'scanning' → Câmara ativa. Aguarda leitura EAN/UPC.
//  'loading'  → Bloqueio total. API em curso.
//  'success'  → Produto encontrado. Menu de Operações visível.
// ─────────────────────────────────────────────────────────────────

const VIBRATE_SCAN   = [200, 100, 200]; // padrão duplo — leitores industriais
const VIBRATE_ACTION = [100];           // confirmação de ação

/**
 * BarcodeScanner — Terminal de Operações do Repositor
 *
 * Público-alvo: Funcionários de armazém / PDA Android.
 * Interface: utilitária, alto contraste, botões ≥ 60px.
 *
 * storeId e logout são lidos do AuthContext — sem prop-drilling.
 */
const BarcodeScanner = () => {
    const { user } = useAuth();
    const storeId = user?.storeId ?? null;
    const navigate = useNavigate();

    // ── Estado central da máquina ──────────────────────────────────
    const [status, setStatus]   = useState('idle');
    const [barcode, setBarcode] = useState('');
    const [produto, setProduto] = useState(null);

    // Evita processar o mesmo código duas vezes sem reset
    const lastCodeRef = useRef(null);

    // ── ZXing — câmara traseira (environment) ─────────────────────
    const { ref: videoRef } = useZxing({
        paused: status !== 'scanning',
        constraints: { video: { facingMode: { ideal: 'environment' } } },
        onDecodeResult: useCallback((result) => {
            const code = result.getText();
            if (!code || code === lastCodeRef.current) return;
            handleScanSuccess(code);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [storeId]),
    });

    // ── Fechar com tecla Escape — navega para a rota anterior ──────
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') navigate(-1); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [navigate]);

    // ── Reset total — volta sempre a 'idle' ────────────────────────
    const resetToIdle = useCallback(() => {
        lastCodeRef.current = null;
        setBarcode('');
        setProduto(null);
        setStatus('idle');
    }, []);

    // ── Core: processar código lido ────────────────────────────────
    const handleScanSuccess = useCallback(async (code) => {
        lastCodeRef.current = code;

        // 1. Feedback háptico imediato — padrão duplo industrial
        if (navigator.vibrate) navigator.vibrate(VIBRATE_SCAN);

        setBarcode(code);
        setStatus('loading');

        try {
            const p = await apiService.getProductByBarcode(code, storeId);
            setProduto(p);
            setStatus('success');
        } catch {
            alert(`❌ Produto não encontrado para o código:\n${code}`);
            resetToIdle();
        }
    }, [storeId, resetToIdle]);

    // ── Simular scan no PC (botão de teste) ───────────────────────
    const handleSimularScan = () => {
        const codigo = window.prompt('Código de barras (EAN/UPC) para simular:');
        if (codigo && codigo.trim()) {
            handleScanSuccess(codigo.trim());
        }
    };

    // ── Operação 1: Trocar de Prateleira ─────────────────────────
    const handleTrocarPrateleira = async () => {
        const input = window.prompt('ID da nova Prateleira:');
        if (!input || !input.trim()) return;

        const novaPrateleiraId = Number(input.trim());
        if (!Number.isInteger(novaPrateleiraId) || novaPrateleiraId <= 0) {
            alert('⚠️ ID de prateleira inválido. Introduza um número inteiro positivo.');
            return;
        }

        if (navigator.vibrate) navigator.vibrate(VIBRATE_ACTION);
        setStatus('loading');

        try {
            await apiService.trocarPrateleira(barcode, storeId, novaPrateleiraId);
            alert(`✅ Produto movido para prateleira ${novaPrateleiraId} com sucesso.`);
        } catch (err) {
            alert(`❌ Erro ao trocar prateleira:\n${err?.message ?? err}`);
        } finally {
            resetToIdle();
        }
    };

    // ── Operação 2: Eliminar Produto ─────────────────────────────
    const handleEliminarProduto = async () => {
        const confirmado = window.confirm(
            `⚠️ ATENÇÃO\n\nVai eliminar o produto:\n"${produto?.nome ?? barcode}"\n\nEsta ação é irreversível.\n\nConfirma?`
        );
        if (!confirmado) return;

        if (navigator.vibrate) navigator.vibrate(VIBRATE_ACTION);
        setStatus('loading');

        try {
            await apiService.eliminarProduto(barcode, storeId);
            alert(`🗑️ Produto "${produto?.nome ?? barcode}" eliminado com sucesso.`);
        } catch (err) {
            alert(`❌ Erro ao eliminar produto:\n${err?.message ?? err}`);
        } finally {
            resetToIdle();
        }
    };

    // ─────────────────────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────────────────────
    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Terminal de Scanner">
            <div className={styles.modal}>

                {/* ── CABEÇALHO ─────────────────────────────────── */}
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>
                        📷 MODO REPOSITOR
                    </span>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Fechar terminal"
                    >
                        ✕
                    </button>
                </div>

                {/* ══════════════════════════════════════════════
                    ESTADO: idle
                    Botão gigante de arranque.
                    ══════════════════════════════════════════════ */}
                {status === 'idle' && (
                    <div className={styles.idlePanel}>
                        <p className={styles.idleHint}>Terminal pronto para leitura</p>
                        <button
                            type="button"
                            className={styles.startBtn}
                            onClick={() => setStatus('scanning')}
                        >
                            📸 INICIAR LEITURA
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ESTADO: scanning
                    Câmara ativa + botão de simulação para PC.
                    ══════════════════════════════════════════════ */}
                {status === 'scanning' && (
                    <div className={styles.scanningPanel}>
                        <div className={styles.cameraWrap}>
                            <video
                                ref={videoRef}
                                className={styles.video}
                                autoPlay
                                playsInline
                                muted
                            />
                            {/* Mira de alinhamento */}
                            <div className={styles.scanFrame}>
                                <div className={styles.scanLine} />
                            </div>
                        </div>
                        <p className={styles.cameraHint}>
                            Aponta a câmara para o código de barras
                        </p>
                        {/* Botão de teste — PC / dev */}
                        <button
                            type="button"
                            className={styles.simulateBtn}
                            onClick={handleSimularScan}
                        >
                            🖥️ Simular Scan (teste PC)
                        </button>
                        <button
                            type="button"
                            className={styles.cancelScanBtn}
                            onClick={resetToIdle}
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ESTADO: loading
                    Bloqueio total — nenhuma ação disponível.
                    ══════════════════════════════════════════════ */}
                {status === 'loading' && (
                    <div className={styles.loadingPanel}>
                        <div className={styles.spinner} aria-hidden="true" />
                        <p className={styles.loadingText}>A comunicar com o servidor...</p>
                        {barcode && (
                            <p className={styles.loadingBarcode}>Código: {barcode}</p>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ESTADO: success
                    Produto encontrado — Menu de Operações.
                    ══════════════════════════════════════════════ */}
                {status === 'success' && produto && (
                    <div className={styles.successPanel}>
                        {/* Cabeçalho do produto */}
                        <div className={styles.productCard}>
                            <span className={styles.productLabel}>PRODUTO IDENTIFICADO</span>
                            <h2 className={styles.productName}>{produto.nome}</h2>
                            <div className={styles.productMeta}>
                                <span className={styles.barcodeDisplay}>{barcode}</span>
                                <span className={styles.metaDot}>·</span>
                                <span>{produto.categoria ?? 'Sem categoria'}</span>
                                <span className={styles.metaDot}>·</span>
                                <span>{produto.nomeCorredor} / {produto.nomePrateleira}</span>
                            </div>
                            <div className={styles.stockBadge}>
                                Stock: <strong>{produto.stock ?? 0}</strong> un.
                            </div>
                        </div>

                        {/* ── Operações ─────────────────────────────── */}
                        <div className={styles.operationsMenu}>
                            <span className={styles.menuLabel}>SELECIONAR OPERAÇÃO</span>

                            {/* Operação 1 — Trocar Prateleira */}
                            <button
                                type="button"
                                className={`${styles.opBtn} ${styles.opBtnPrimary}`}
                                onClick={handleTrocarPrateleira}
                            >
                                📦 Trocar de Prateleira
                            </button>

                            {/* Operação 2 — Eliminar Produto */}
                            <button
                                type="button"
                                className={`${styles.opBtn} ${styles.opBtnDanger}`}
                                onClick={handleEliminarProduto}
                            >
                                🗑️ Eliminar Produto
                            </button>

                            {/* Operação 3 — Voltar */}
                            <button
                                type="button"
                                className={`${styles.opBtn} ${styles.opBtnSecondary}`}
                                onClick={resetToIdle}
                            >
                                🔙 Voltar Atrás
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default BarcodeScanner;
