const generatorBtn = document.getElementById('generator-btn');
const lottoNumbersContainer = document.getElementById('lotto-numbers');

generatorBtn.addEventListener('click', () => {
    const lottoNumbers = generateLottoNumbers();
    displayLottoNumbers(lottoNumbers);
});

function generateLottoNumbers() {
    const numbers = new Set();
    while (numbers.size < 5) {
        const randomNumber = Math.floor(Math.random() * 45) + 1;
        numbers.add(randomNumber);
    }
    return Array.from(numbers);
}

function displayLottoNumbers(numbers) {
    lottoNumbersContainer.innerHTML = numbers.map(number => `<div class="lotto-number">${number}</div>`).join('');
}
