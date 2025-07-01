document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const spinBtn = document.getElementById('spin-btn');
    const betInput = document.getElementById('bet');
    const balanceSpan = document.getElementById('balance');
    const messageDiv = document.getElementById('message');
    const usePromoBtn = document.getElementById('use-promo');
    const promoCodeInput = document.getElementById('promo-code');
    const betButtons = document.querySelectorAll('.bet-btn');
    const spinSound = new Audio('/static/sounds/spin.mp3');
    const winSound = new Audio('/static/sounds/win.mp3');
    const slotImages = [
        document.getElementById('slot1'),
        document.getElementById('slot2'),
        document.getElementById('slot3')
    ];
    const winLine = document.querySelector('.win-line');
    const particlesContainer = document.getElementById('particles');

    // State
    let isSpinning = false;

    // Initialize
    updateBalanceDisplay();

    // Event listeners
    betButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (isSpinning) return;

            let change = this.dataset.change;
            let currentBet = parseInt(betInput.value);
            let newBet;

            if (change.startsWith('+')) {
                newBet = currentBet + parseInt(change.slice(1));
            } else {
                newBet = currentBet - parseInt(change.slice(1));
            }

            if (newBet >= 10) {
                betInput.value = newBet;
            }
        });
    });

    spinBtn.addEventListener('click', spin);

    usePromoBtn.addEventListener('click', function() {
        if (isSpinning) return;

        const promoCode = promoCodeInput.value.trim();

        if (!promoCode) {
            showMessage('Please enter promo code', false);
            return;
        }

        fetch('/use_promo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `promo_code=${promoCode}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                balanceSpan.textContent = data.balance;
                showMessage(data.message, true);
                promoCodeInput.value = '';
                createConfetti();
            } else {
                showMessage(data.message, false);
            }
        });
    });
    function spin() {
        spinSound.currentTime = 0;
        spinSound.play().catch(e => console.log("Audio play error:", e));
        if (isSpinning) return;

        const bet = parseInt(betInput.value);
        const currentBalance = parseInt(balanceSpan.textContent);

        if (bet > currentBalance) {
            showMessage('Not enough balance', false);
            return;
        }

        isSpinning = true;
        spinBtn.disabled = true;
        hideMessage();

        // Время прокрутки (в миллисекундах)
        const spinDuration = 3100; // 4 секунды общее время
        const startTime = Date.now();

        // Частота смены картинок (2 в секунду = 1 картинка каждые 500мс)
        const imageChangeInterval = 200;
        let lastChangeTime = 0;

        fetch('/spin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `bet=${bet}`
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                showMessage(data.message, false);
                isSpinning = false;
                spinBtn.disabled = false;
                return;
            }

            balanceSpan.textContent = data.balance;

            const animateSpin = (timestamp) => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / spinDuration, 1);

                // Меняем картинки каждые 500мс (2 раза в секунду)
                if (elapsed - lastChangeTime >= imageChangeInterval) {
                    lastChangeTime = elapsed - (elapsed % imageChangeInterval);

                    // Показываем случайные картинки во время прокрутки
                    if (progress < 0.8) {
                        for (let i = 0; i < 3; i++) {
                            const randomValue = Math.floor(Math.random() * 7) + 1;
                            slotImages[i].src = `/static/images/${randomValue}.png`;
                        }
                    }
                    // Замедление в конце
                    else {
                        for (let i = 0; i < 3; i++) {
                            // Останавливаем слоты по очереди
                            if (progress > 0.8 + i * 0.1) {
                                slotImages[i].src = `/static/images/${data.result[i]}.png`;
                            } else {
                                const randomValue = Math.floor(Math.random() * 7) + 1;
                                slotImages[i].src = `/static/images/${randomValue}.png`;
                            }
                        }
                    }
                }

                if (progress < 1) {
                    requestAnimationFrame(animateSpin);
                } else {
                    // Убедимся, что все слоты показывают финальные картинки
                    for (let i = 0; i < 3; i++) {
                        slotImages[i].src = `/static/images/${data.result[i]}.png`;
                    }
                    finishSpin(data);
                }
            };

            animateSpin();
        });
    }

    function finishSpin(data) {
        // Set final images
        for (let i = 0; i < 3; i++) {
            slotImages[i].src = `/static/images/${data.result[i]}.png`;
        }
        // Check for win
        if (data.win > 0) {
            winSound.currentTime = 0;
            winSound.play().catch(e => console.log("Audio play error:", e));
            showMessage(`WIN! +${data.win} coins`, true);
            winLine.classList.add('active');
            createConfetti();
            document.querySelector('.game-container').classList.add('win-animation');
            setTimeout(() => {
                document.querySelector('.game-container').classList.remove('win-animation');
            }, 500);
        } else {
            showMessage('Try Again!', false);
        }

        // Update balance (including any winnings)
        balanceSpan.textContent = data.balance;

        // Reset spin state
        setTimeout(() => {
            winLine.classList.remove('active');
            isSpinning = false;
            spinBtn.disabled = false;
        }, 1000);
    }

    function showMessage(text, isSuccess) {
        messageDiv.textContent = text;
        messageDiv.style.color = isSuccess ? '#4cff00' : '#0077ff';
        messageDiv.classList.add('show');
        messageDiv.style.textShadow = isSuccess
            ? '0 0 10px rgba(76, 255, 0, 0.7)'
            : '0 0 10px rgba(0, 119, 255, 0.7)';
    }

    function hideMessage() {
        messageDiv.classList.remove('show');
    }

    function updateBalanceDisplay() {
        balanceSpan.style.transform = 'scale(1.1)';
        setTimeout(() => {
            balanceSpan.style.transform = 'scale(1)';
        }, 200);
    }

    function createConfetti() {
        particlesContainer.innerHTML = '';
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            // Random properties
            const x = Math.random() * 100;
            const y = Math.random() * 100 - 10;
            const size = Math.random() * 6 + 2;
            const colors = ['#0077ff', '#00a2ff', '#ffffff', '#b3d1ff'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const duration = Math.random() * 3 + 2;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;

            // Apply styles
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 ${size*2}px ${color}`;
            particle.style.transition = `all ${duration}s linear`;
            particle.style.opacity = '1';

            particlesContainer.appendChild(particle);

            // Animate
            setTimeout(() => {
                particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
                particle.style.opacity = '0';
            }, 10);

            // Remove after animation
            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        }
    }
});

document.getElementById('spin-btn').addEventListener('click', handleSpinAction);
    function handleSpinAction() {
    if (!isSpinning) {
        spin();
    }
document.addEventListener('keydown', function(event) {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
    if (event.key === 'Enter' && !isInputFocused) {
        event.preventDefault();
        handleSpinAction();
    }
});
});
