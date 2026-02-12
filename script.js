import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* ================= FIREBASE ================= */
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= ESTADO ================= */
let currentUser = null;
let selectedDate = "";
let selectedTime = "";
let selectedBarber = "";

/* ================= UI ================= */
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

/* ================= AUTH ================= */
const initAuth = async () => {
    try { 
        await signInAnonymously(auth); 
    } catch (error) {
        console.log("Erro na autenticação:", error);
    }
};
onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        console.log("Usuário autenticado:", user.uid);
    }
});
initAuth();

/* ================= DROPDOWN SERVIÇO ================= */
dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownOptions.classList.toggle('show');
});

dropdownOptions.addEventListener('click', (e) => {
    e.stopPropagation();
});

document.addEventListener('click', () => {
    dropdownOptions.classList.remove('show');
});

window.selectDropdownService = (name, price) => {
    selectedServiceText.innerText = `${name} - R$ ${price},00`;
    inputService.value = name;
    dropdownOptions.classList.remove('show');
};

/* ================= BARBEIRO ================= */
window.selectBarber = (element, name) => {
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    selectedBarber = name;
    selectedTime = "";
    generateTimes();
};

/* ================= MODAL ================= */
window.openBooking = () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    generateDates();
    generateTimes();
};

window.closeBooking = () => {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    // REMOVIDO: location.reload(); - Isso causava o problema!
};

/* ================= DATAS ================= */
function generateDates() {
    dateList.innerHTML = "";
    const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        if (date.getDay() === 0) continue;

        const fullDateStr = date.toLocaleDateString('pt-BR');
        const chip = document.createElement('div');

        chip.className = "chip min-w-[65px] flex flex-col items-center p-3 rounded-xl border border-white/10";
        chip.innerHTML = `
            <span class="text-[9px] uppercase opacity-50">${days[date.getDay()]}</span>
            <span class="text-base font-bold">${date.getDate()}</span>
        `;

        chip.onclick = () => {
            document.querySelectorAll('#dateList .chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedDate = fullDateStr;
            selectedTime = "";
            generateTimes();
        };

        if (i === 0 && !selectedDate) {
            chip.classList.add('selected');
            selectedDate = fullDateStr;
        }

        dateList.appendChild(chip);
    }
}

/* ================= HORÁRIOS ================= */
async function getBookedTimes(date, barber) {
    if (!date || !barber) return [];

    try {
        const col = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
        const q = query(col, where("date","==",date), where("barber","==",barber));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data().time);
    } catch (error) {
        console.error("Erro ao buscar horários:", error);
        return [];
    }
}

async function generateTimes() {
    timeGrid.innerHTML = "";

    if (!selectedDate || !selectedBarber) {
        timeGrid.innerHTML = `<p class="text-xs text-gray-500 text-center">Selecione data e barbeiro</p>`;
        return;
    }

    const times = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00","19:00"];
    const booked = await getBookedTimes(selectedDate, selectedBarber);

    times.forEach(time => {
        const chip = document.createElement('div');
        const ocupado = booked.includes(time);

        chip.className = `chip text-center py-3 rounded-lg text-sm border ${ocupado ? 'opacity-40 cursor-not-allowed bg-black/30' : 'hover:border-gold'}`;
        chip.innerHTML = ocupado ? `${time}<div class="text-[9px] text-red-400">Ocupado</div>` : time;

        if (!ocupado) {
            chip.onclick = () => {
                document.querySelectorAll('#timeGrid .chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                selectedTime = time;
            };
        }

        timeGrid.appendChild(chip);
    });
}

/* ================= SUBMIT ================= */
bookingForm.onsubmit = async (e) => {
    e.preventDefault();

    if (!inputService.value || !selectedBarber || !selectedTime) {
        alert("Preencha todos os campos");
        return;
    }

    if (!currentUser) {
        alert("Aguardando autenticação... Tente novamente.");
        return;
    }

    loadingOverlay.style.display = 'flex';

    try {
        await addDoc(
            collection(db, 'artifacts', appId, 'public', 'data', 'bookings'),
            {
                clientName: document.getElementById('inputName').value,
                clientPhone: inputPhone.value,
                service: inputService.value,
                barber: selectedBarber,
                date: selectedDate,
                time: selectedTime,
                createdAt: serverTimestamp(),
                userId: currentUser.uid
            }
        );
        
        alert("✅ Agendamento confirmado!");
        
        // Limpa o formulário
        bookingForm.reset();
        selectedServiceText.innerText = "Escolha um serviço";
        selectedBarber = "";
        selectedDate = "";
        selectedTime = "";
        
        // Remove seleções visuais
        document.querySelectorAll('.barber-card.selected, .chip.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        closeBooking();
        
    } catch (error) {
        console.error("Erro ao agendar:", error);
        alert("Erro ao realizar agendamento. Tente novamente.");
    } finally {
        loadingOverlay.style.display = 'none';
    }
};
