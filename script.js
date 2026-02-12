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

// Configuração do Firebase
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

// Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estado
let currentUser = null;
let selectedDate = "";
let selectedTime = "";
let selectedBarber = "";

// UI
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

// Auth
const initAuth = async () => {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error(error);
    }
};

onAuthStateChanged(auth, user => currentUser = user);
initAuth();

// 🔍 BUSCAR HORÁRIOS OCUPADOS
async function getBookedTimes(date, barber) {
    if (!date || !barber) return [];

    const bookingsCol = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
    const q = query(
        bookingsCol,
        where("date", "==", date),
        where("barber", "==", barber)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().time);
}

// Serviço
window.selectDropdownService = (name, price) => {
    selectedServiceText.innerText = `${name} - R$ ${price},00`;
    inputService.value = name;
    dropdownOptions.classList.remove('show');
};

// Barbeiro
window.selectBarber = (element, name) => {
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    selectedBarber = name;
    selectedTime = "";
    generateTimes();
};

// Abrir modal
window.openBooking = () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    generateDates();
    generateTimes();
};

window.closeBooking = () => {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    location.reload();
};

// Datas
function generateDates() {
    dateList.innerHTML = "";
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        if (date.getDay() === 0) continue;

        const chip = document.createElement('div');
        const fullDateStr = date.toLocaleDateString('pt-BR');

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

        if (i === 0) {
            chip.classList.add('selected');
            selectedDate = fullDateStr;
        }

        dateList.appendChild(chip);
    }
}

// ⏰ HORÁRIOS COM BLOQUEIO
async function generateTimes() {
    timeGrid.innerHTML = "";

    if (!selectedDate || !selectedBarber) {
        timeGrid.innerHTML = `<p class="text-xs text-gray-500 text-center col-span-3">
            Selecione data e barbeiro
        </p>`;
        return;
    }

    const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
    const bookedTimes = await getBookedTimes(selectedDate, selectedBarber);

    times.forEach(time => {
        const chip = document.createElement('div');
        const ocupado = bookedTimes.includes(time);

        chip.className = `
            chip text-center py-2 rounded-lg text-sm border
            ${ocupado ? 'opacity-40 cursor-not-allowed bg-black/30' : 'border-white/10'}
        `;

        chip.innerHTML = ocupado
            ? `${time}<div class="text-[9px] text-red-400">Ocupado</div>`
            : time;

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

// Submit
if (bookingForm) {
    bookingForm.onsubmit = async e => {
        e.preventDefault();

        if (!selectedBarber || !selectedTime) {
            alert("Selecione barbeiro e horário");
            return;
        }

        loadingOverlay.style.display = 'flex';

        const data = {
            clientName: document.getElementById('inputName').value,
            clientPhone: inputPhone.value,
            service: inputService.value,
            barber: selectedBarber,
            date: selectedDate,
            time: selectedTime,
            createdAt: serverTimestamp(),
            userId: currentUser.uid
        };

        const col = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
        await addDoc(col, data);
        alert("Agendamento confirmado!");
        location.reload();
    };
}
