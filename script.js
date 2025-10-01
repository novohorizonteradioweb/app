// Este arquivo pode ser usado para adicionar funcionalidades no futuro
console.log("Rádio Sol FM está ao vivo!");
// Variáveis globais para o espectro de áudio
let audioContext;
let analyser;
let dataArray;
let canvas;
let canvasContext;
let source;
let isSpectrumActive = false;

document.addEventListener('DOMContentLoaded', () => {
    const audio = document.querySelector('audio');
    const closeButton = document.querySelector('.close-button');
    const bars = document.querySelectorAll('.bar');
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');

 // Inicializa o canvas do espectro
    canvas = document.getElementById('spectrum-canvas');
    canvasContext = canvas.getContext('2d');
    
    // Configura o tamanho do canvas
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inicializa o Web Audio API
    function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 512; // Aumentado para melhor resolução
                analyser.smoothingTimeConstant = 0.8;
                
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                
                // Conecta o elemento de áudio ao analisador
                if (!source) {
                    source = audioContext.createMediaElementSource(audio);
                    source.connect(analyser);
                    analyser.connect(audioContext.destination);
                }
                
                isSpectrumActive = true;
                console.log('Web Audio API inicializado com sucesso');
                drawSpectrum();
            } catch (error) {
                console.log('Web Audio API não suportado:', error);
                // Fallback para animação CSS apenas
                startFallbackAnimation();
            }
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumido');
            });
        }
    }

    // Desenha o espectro no canvas
    function drawSpectrum() {
        if (!isSpectrumActive) return;
        
        requestAnimationFrame(drawSpectrum);
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        // Novo tipo de visualização: ondas circulares
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) / 3;
        
        // Desenha múltiplos círculos concêntricos
        for (let ring = 0; ring < 3; ring++) {
            const ringRadius = maxRadius * (0.3 + ring * 0.3);
            const angleStep = (Math.PI * 2) / (dataArray.length / 4);
            
            canvasContext.beginPath();
            
            for (let i = 0; i < dataArray.length / 4; i++) {
                const angle = i * angleStep;
                const amplitude = (dataArray[i * 4] / 255) * 30;
                const radius = ringRadius + amplitude;
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }
            }
            
            canvasContext.closePath();
            
            // Gradiente circular para cada anel
            const gradient = canvasContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, ringRadius + 30);
            gradient.addColorStop(0, `rgba(102, 204, 255, ${0.8 - ring * 0.2})`);
            gradient.addColorStop(0.5, `rgba(51, 153, 255, ${0.6 - ring * 0.15})`);
            gradient.addColorStop(1, `rgba(0, 102, 204, ${0.4 - ring * 0.1})`);
            
            canvasContext.strokeStyle = gradient;
            canvasContext.lineWidth = 2 + ring;
            canvasContext.stroke();
        }
        
        // Atualiza as barras CSS também
        updateCSSBars();
    }

    // Atualiza as barras CSS com base nos dados de áudio
    function updateCSSBars() {
        if (!dataArray) return;
        
        // Separa as frequências em faixas: graves (0-10%), médios (10-60%), agudos (60-100%)
        const bassRange = Math.floor(dataArray.length * 0.1); // Primeiros 10% para graves
        const midRange = Math.floor(dataArray.length * 0.6);  // 10-60% para médios
        
        // Calcula a intensidade média dos graves
        let bassIntensity = 0;
        for (let i = 0; i < bassRange; i++) {
            bassIntensity += dataArray[i];
        }
        bassIntensity = bassIntensity / bassRange / 255; // Normaliza entre 0-1
        
        // Efeito de "kick" do grave - amplifica quando há picos de grave
        const bassKick = bassIntensity > 0.6 ? bassIntensity * 2 : bassIntensity;
        
        const step = Math.floor(dataArray.length / bars.length);
        
        bars.forEach((bar, index) => {
            const dataIndex = index * step;
            let value = dataArray[dataIndex] || 0;
            
            // Aplica efeito de grave mais intenso nas primeiras barras (graves)
            if (index < bars.length * 0.3) { // Primeiras 30% das barras reagem aos graves
                value = Math.max(value, bassKick * 255 * 0.8); // Amplifica com o kick do grave
            }
            
            // Altura base mínima e máxima com efeito de grave
            const baseHeight = 8;
            const maxHeight = bassKick > 0.7 ? 80 : 60; // Aumenta altura máxima com graves intensos
            const height = Math.max(baseHeight, (value / 255) * maxHeight + baseHeight);
            
            bar.style.height = height + 'px';
            
            // Adiciona efeito visual extra para graves intensos
            if (bassKick > 0.7 && index < bars.length * 0.3) {
                bar.style.boxShadow = `0 0 ${15 + bassKick * 20}px rgba(0, 123, 255, ${0.8 + bassKick * 0.2})`;
            }
        });
    }

    // Animação de fallback quando Web Audio API não está disponível
    function startFallbackAnimation() {
        console.log('Iniciando animação de fallback');
        let fallbackInterval;
        
        const animateBars = () => {
            bars.forEach((bar, index) => {
                // Animação mais realista que simula espectro de áudio com efeito de grave
                const baseHeight = 8;
                const maxHeight = 50;
                
                // Simula efeito de grave nas primeiras barras
                const bassEffect = index < bars.length * 0.3 ? 
                    Math.sin(Date.now() * 0.003) * 0.5 + 0.5 : 0.3;
                
                const randomFactor = Math.sin(Date.now() * 0.001 + index * 0.5) * 0.5 + 0.5;
                const height = baseHeight + (randomFactor * maxHeight * (1 + bassEffect));
                
                bar.style.height = height + 'px';
                
                // Efeito visual extra para graves simulados
                if (bassEffect > 0.7 && index < bars.length * 0.3) {
                    bar.style.boxShadow = `0 0 ${15 + bassEffect * 20}px rgba(0, 123, 255, ${0.8 + bassEffect * 0.2})`;
                } else {
                    bar.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)';
                }
            });
            
            // Anima o canvas também com padrão circular
            animateFallbackCanvas();
        };
        
        // Limpa intervalo anterior se existir
        if (fallbackInterval) clearInterval(fallbackInterval);
        fallbackInterval = setInterval(animateBars, 100);
        
        return fallbackInterval;
    }
    
    // Animação de fallback para o canvas circular
    function animateFallbackCanvas() {
        if (!canvas || !canvasContext) return;
        
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) / 3;
        const time = Date.now() * 0.002;
        
        // Desenha múltiplos círculos concêntricos animados
        for (let ring = 0; ring < 3; ring++) {
            const ringRadius = maxRadius * (0.3 + ring * 0.3);
            const angleStep = (Math.PI * 2) / 32;
            
            canvasContext.beginPath();
            
            for (let i = 0; i < 32; i++) {
                const angle = i * angleStep;
                const amplitude = Math.sin(time + ring * 0.5 + i * 0.2) * 15 + 15;
                const radius = ringRadius + amplitude;
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }
            }
            
            canvasContext.closePath();
            
            // Gradiente circular para cada anel
            const gradient = canvasContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, ringRadius + 30);
            gradient.addColorStop(0, `rgba(102, 204, 255, ${0.8 - ring * 0.2})`);
            gradient.addColorStop(0.5, `rgba(51, 153, 255, ${0.6 - ring * 0.15})`);
            gradient.addColorStop(1, `rgba(0, 102, 204, ${0.4 - ring * 0.1})`);
            
            canvasContext.strokeStyle = gradient;
            canvasContext.lineWidth = 2 + ring;
            canvasContext.stroke();
        }
    }

    // Função para atualizar status do stream (placeholder)
    function updateStreamStatus(status, message) {
        console.log(`Status: ${status} - ${message}`);
        // Esta função pode ser expandida para mostrar status na UI
    }

    // Função para tentar reconectar (placeholder)
    function retryConnection() {
        console.log('Tentando reconectar...');
        audio.load();
    }

    // Initial status
    updateStreamStatus('', 'Clique em Play para conectar');
    
    // Event listeners para o áudio com tratamento de erros aprimorado
    audio.addEventListener('loadstart', () => {
        updateStreamStatus('connecting', 'Conectando ao stream...');
    });
    
    audio.addEventListener('loadeddata', () => {
        updateStreamStatus('connected', 'Stream carregado');
    });

    audio.addEventListener('canplay', () => {
        updateStreamStatus('connected', 'Pronto para reproduzir');
    });
    
    audio.addEventListener('canplaythrough', () => {
        updateStreamStatus('connected', 'Stream totalmente carregado');
    });

    audio.addEventListener('play', () => {
        document.body.classList.add('playing');
        updateStreamStatus('playing', 'Reproduzindo ao vivo');
        
        // Inicializa o contexto de áudio na primeira interação do usuário
        setTimeout(() => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('AudioContext resumido no play');
                });
            } else if (!audioContext) {
                initAudioContext();
            }
        }, 100); // Pequeno delay para garantir que o áudio começou a tocar
    });

    audio.addEventListener('pause', () => {
        document.body.classList.remove('playing');
        updateStreamStatus('connected', 'Pausado');
    });

    audio.addEventListener('ended', () => {
        document.body.classList.remove('playing');
        updateStreamStatus('connected', 'Transmissão finalizada');
    });

    audio.addEventListener('error', (e) => {
        let errorMessage = 'Erro de conexão';
        
        if (audio.error) {
            switch(audio.error.code) {
                case 1: // MEDIA_ERR_ABORTED
                    errorMessage = 'Conexão interrompida';
                    break;
                case 2: // MEDIA_ERR_NETWORK
                    errorMessage = 'Erro de rede - Verifique sua conexão';
                    break;
                case 3: // MEDIA_ERR_DECODE
                    errorMessage = 'Erro de decodificação';
                    break;
                case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                    errorMessage = 'Stream não disponível no momento';
                    break;
                default:
                    errorMessage = 'Erro desconhecido';
            }
        }
        
        console.error('Erro no stream de áudio:', e, audio.error);
        updateStreamStatus('error', errorMessage);
        
        // Auto-retry with next source after 2 seconds
        setTimeout(() => {
            console.log('Auto-switching to next source...');
            retryConnection();
        }, 2000);
    });

    audio.addEventListener('stalled', () => {
        updateStreamStatus('conectando', 'Conexão instável...');
    });

    audio.addEventListener('waiting', () => {
        updateStreamStatus('conectando', 'Aguardando dados...');
    });
    
    audio.addEventListener('progress', () => {
        if (audio.buffered.length > 0) {
            updateStreamStatus('conectando', 'Stream online...');
        }
    });
    
    // Attempt to preload when user interacts
    audio.addEventListener('click', () => {
        if (audio.readyState === 0) {
            updateStreamStatus('conectando', 'Stream online...');
            audio.load();
        }
    });

    // Adiciona efeito de hover no botão de fechar
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.transform = 'translateY(-2px)';
    });

    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.transform = 'translateY(0)';
    });

    // Salva o estado do player quando a página é fechada
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('radioVolume', audio.volume);
        localStorage.setItem('radioMuted', audio.muted);
    });

    // Restaura o estado do player quando a página é carregada
    if (localStorage.getItem('radioVolume')) {
        audio.volume = parseFloat(localStorage.getItem('radioVolume'));
    }
    if (localStorage.getItem('radioMuted')) {
        audio.muted = localStorage.getItem('radioMuted') === 'true';
    }

    // Inicializa a animação de fallback imediatamente
    startFallbackAnimation();
    
    // Força o carregamento do stream
    audio.load();
});