import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do Firebase (Substitua com suas credenciais)
const firebaseConfig = {
  apiKey: "AIzaSyBtOQPpVzbeuSizL-W75CiKzSe_g1tDYZ8",
  authDomain: "barbearia-elite-a502f.firebaseapp.com",
  projectId: "barbearia-elite-a502f",
  storageBucket: "barbearia-elite-a502f.firebasestorage.app",
  messagingSenderId: "1020986561486",
  appId: "1:1020986561486:web:46b3969741cb8ead34519f",
  measurementId: "G-HTFG21H62Z"
};

const appId = 'barber-elite-app';

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variáveis de estado
let currentUser = null;
let selectedDate = "";
let selectedTime = "";
let selectedBarber = "";

// Referências da Interface (UI)
const modal = document.getElementById('bookingModal');
const modalBody = document.getElementById('modalBody');
const loadingOverlay = document.getElementById('loadingOverlay');
const dropdownBtn = document.getElementById('dropdownBtn');
const dropdownOptions = document.getElementById('dropdownOptions');
const selectedServiceText = document.getElementById('selectedServiceText');
const inputService = document.getElementById('inputService');
const inputPhone = document.getElementById('inputPhone');
const dateList = document.getElementById('dateList');
const timeGrid = document.getElementById('timeGrid');
const bookingForm = document.getElementById('bookingForm');

// Inicialização da Autenticação
const initAuth = async () => {
    try {
        await signInAnonymously(auth);
        console.log("Autenticação anônima realizada com sucesso");
    } catch (error) {
        console.error("Autenticação falhou:", error);
    }
};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log("Estado do usuário alterado:", user ? "Autenticado" : "Não autenticado");
});

// Inicia a autenticação
initAuth();

// Máscara de Telefone
if (inputPhone) {
    inputPhone.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        let masked = "";
        if (value.length > 0) masked += "(" + value.substring(0, 2);
        if (value.length > 2) masked += ") " + value.substring(2, 7);
        if (value.length > 7) masked += "-" + value.substring(7, 11);
        e.target.value = masked;
    });
}

// Funções Globais (acessíveis via onclick no HTML)
window.selectDropdownService = (name, price) => {
    selectedServiceText.innerText = `${name} - R$ ${price},00`;
    inputService.value = name;
    dropdownOptions.classList.remove('show');
    dropdownBtn.style.borderColor = 'var(--gold)';
};

window.selectBarber = (element, name) => {
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    selectedBarber = name;
};

window.openBooking = (serviceName = "") => {
    if (serviceName) {
        const prices = {
            'Corte Elite': 60,
            'Barba de Honra': 45,
            'Combo Imperial': 95
        };
        if (prices[serviceName]) {
            window.selectDropdownService(serviceName, prices[serviceName]);
        }
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    generateDates();
    generateTimes();
};

window.closeBooking = () => {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (modalBody.querySelector('.confirmation-card')) {
        setTimeout(() => location.reload(), 300);
    }
};

// Event Listeners
if (dropdownBtn) {
    dropdownBtn.onclick = () => dropdownOptions.classList.toggle('show');
}

// Gerador de Datas
function generateDates() {
    if (!dateList) return;
    
    dateList.innerHTML = "";
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        if (date.getDay() === 0) continue;

        const dayName = days[date.getDay()];
        const dayNum = date.getDate();
        const fullDateStr = date.toLocaleDateString('pt-BR');

        const chip = document.createElement('div');
        chip.className = `chip min-w-[65px] flex flex-col items-center p-3 rounded-xl border border-white/10`;
        chip.innerHTML = `<span class="text-[9px] uppercase opacity-50">${dayName}</span>
                         <span class="text-base font-bold">${dayNum}</span>`;
        
        chip.onclick = () => {
            document.querySelectorAll('#dateList .chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedDate = fullDateStr;
        };
        
        if (i === 0 || (i === 1 && today.getDay() === 0)) {
            chip.classList.add('selected');
            selectedDate = fullDateStr;
        }
        
        dateList.appendChild(chip);
    }
}

// Gerador de Horários
function generateTimes() {
    if (!timeGrid) return;
    
    timeGrid.innerHTML = "";
    const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
    
    times.forEach(t => {
        const chip = document.createElement('div');
        chip.className = "chip text-center py-2 rounded-lg text-sm border border-white/10";
        chip.innerText = t;
        
        chip.onclick = () => {
            document.querySelectorAll('#timeGrid .chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedTime = t;
        };
        
        timeGrid.appendChild(chip);
    });
}

// Função de Sucesso
function renderSuccess(nome, servico, barbeiro, data, hora) {
    if (!modalBody) return;
    
    loadingOverlay.style.display = 'none';
    modalBody.innerHTML = `
        <div class="py-10 flex flex-col items-center">
            <div class="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            
            <h2 class="text-2xl font-bold mb-6 font-oswald text-gold tracking-widest uppercase text-center">
                Reserva Confirmada no Sistema
            </h2>
            
            <div class="confirmation-card w-full p-8 shadow-2xl mb-8">
                <div class="flex flex-col gap-4">
                    <div class="border-b border-white/5 pb-4">
                        <span class="text-[10px] uppercase text-gray-500 font-bold block mb-1">Cliente</span>
                        <span class="text-white font-semibold text-lg">${nome}</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                        <div>
                            <span class="text-[10px] uppercase text-gray-500 font-bold block mb-1">Serviço</span>
                            <span class="text-white font-medium text-sm">${servico}</span>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase text-gray-500 font-bold block mb-1">Barbeiro</span>
                            <span class="text-white font-medium text-sm">${barbeiro}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-[10px] uppercase text-gray-500 font-bold block mb-1">Data</span>
                            <span class="text-white font-medium text-sm">${data}</span>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase text-gray-500 font-bold block mb-1">Horário</span>
                            <span class="text-white font-medium text-sm">${hora}</span>
                        </div>
                    </div>
                </div>
            </div>

            <p class="text-gray-400 text-xs text-center mb-10 max-w-[280px]">
                Os seus dados foram salvos com segurança. Vemo-nos em breve!
            </p>

            <button onclick="window.closeBooking()" class="w-full border border-gold text-gold font-bold py-4 rounded-xl font-oswald tracking-widest hover:bg-gold hover:text-black transition">
                CONCLUIR E VOLTAR
            </button>
        </div>
    `;
}

// Submit do Formulário
if (bookingForm) {
    bookingForm.onsubmit = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            initAuth();
            alert("Autenticando... Por favor, tente novamente.");
            return;
        }

        const inputName = document.getElementById('inputName');
        const purePhone = inputPhone.value.replace(/\D/g, '');
        const nomeCliente = inputName.value;

        if (purePhone.length < 11) {
            inputPhone.style.borderColor = "#ef4444";
            return;
        }
        if (!inputService.value || !selectedBarber || !selectedTime) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        loadingOverlay.style.display = 'flex';

        const bookingData = {
            clientName: nomeCliente,
            clientPhone: inputPhone.value,
            service: inputService.value,
            barber: selectedBarber,
            date: selectedDate,
            time: selectedTime,
            createdAt: serverTimestamp(),
            userId: currentUser.uid
        };

        try {
            const bookingsCol = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
            await addDoc(bookingsCol, bookingData);
            renderSuccess(nomeCliente, bookingData.service, bookingData.barber, bookingData.date, bookingData.time);
        } catch (error) {
            console.error("Erro no Firestore:", error);
            loadingOverlay.style.display = 'none';
            
            const errorMsg = document.createElement('p');
            errorMsg.className = "text-red-500 text-sm text-center mt-2";
            errorMsg.innerText = "Erro ao salvar. Verifique sua conexão e tente novamente.";
            bookingForm.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 4000);
        }
    };
}

// Cliques fora do modal
window.onclick = (event) => {
    if (event.target == modal) {
        window.closeBooking();
    }
    if (!event.target.closest('#dropdownBtn') && dropdownOptions) {
        dropdownOptions.classList.remove('show');
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplicação BarberElite inicializada');
});