const stack = document.getElementById('cardsStack');
const overlay = document.getElementById('overlay');
const body = document.body;
let activeCard = null;

function toggleCard(card) {
    if (activeCard === card) {
        closeCard();
        return;
    }

    if (activeCard) {
        activeCard.classList.remove('is-active');
    }

    activeCard = card;
    card.classList.add('is-active');
    stack.classList.add('active-state');
    overlay.classList.add('active');
    body.classList.add('focus-mode');
}

function closeCard() {
    if (activeCard) {
        activeCard.classList.remove('is-active');
        activeCard = null;
    }
    stack.classList.remove('active-state');
    overlay.classList.remove('active');
    body.classList.remove('focus-mode');
}

overlay.addEventListener('click', closeCard);
