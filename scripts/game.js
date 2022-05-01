const SCREEN_HEIGHT = window.innerHeight;
let SCREEN_WIDTH = window.innerWidth;

if (SCREEN_WIDTH > SCREEN_HEIGHT) {
    const screen = document.getElementById('game-screen');
    screen.classList.add('game-screen-landscape');
    SCREEN_WIDTH = SCREEN_WIDTH / 3;
}

const BLOCK_HEIGHT = 52;

const LETTERS = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
];
const SLIDER_LEFT_MIN = 10;
const SLIDER_LEFT_MAX = SCREEN_WIDTH - 75;
const SLIDER_WIDTH = 70;
const SLIDER_MOVE_SPEED = 3;
const ROW_HEIGHT = Math.max(SCREEN_HEIGHT / 10, 80);
const COL_WIDTH = SCREEN_WIDTH / 4;
const TPS = 60;
const TICK_INTERVAL_MS = 1000 / TPS;
const FALL_SPEED = 1.7;
const DEFAULT_SCREEN_COLOR = "rgb(48, 43, 43)";

// Collision constants - adjust to get collision timing right
const COLLISION_MAX = (SCREEN_HEIGHT * 0.85) - (BLOCK_HEIGHT / 2);
const COLLISION_MIN = COLLISION_MAX - (BLOCK_HEIGHT / 2);


// colors
const GRAY = "rgb(150,150,150)";
const GREEN = "rgb(70, 170, 50)";
const YELLOW = "rgb(225,200,50)";

let rows = [];
let blocks = [];
let running = false;
let gameOver = false;
let victory = false;
let leftButtonDown = false;
let rightButtonDown = false;
let fingerDown = false;
let sliderPos = 100;
let stackHeight = 0;
let totalBlocks = 0;

let gameClock = 0;
let rowCount = 0;

// the current word to be guessed - change this every day / every new game
let word;

axios.get('/word')
.then(res => {
    word = res.data.toUpperCase();
})
.catch(err => {
    console.log(err)
})

registerEventListeners();

setInterval(() => {
    if (running) {
        gameClock += 1;
        tick();
    }
}, TICK_INTERVAL_MS);

function playRandom() {
    reset()
    axios.get('/random')
    .then(res => {
        word = res.data.toUpperCase();
        start();
    })
    .catch(err => {
        console.log(err)
    })
}

function tick() {
    const ticksBetweenRows = TPS / FALL_SPEED;
    const ticksSinceLastRow = gameClock % ticksBetweenRows;

    // move rows to top position (0 - ROW_HEIGHT, FALL_SPEED increments)
    moveRows(ticksSinceLastRow * (ROW_HEIGHT / ticksBetweenRows));

    moveSlider(leftButtonDown, rightButtonDown);

    if (Math.floor(gameClock % ticksBetweenRows) == 0) {
        createGameRow();
        if (rows.length > 10) {
            const row = rows.pop();
            row.element.remove();
        }
    }

    // Create a game row above screen if there is space
    if (gameClock % TPS == 0) {
        if (!gameOver) {
            updateClock(gameClock);
        }
    }
}


function updateClock(gameClock) {
    const clock = document.getElementById('clock');
    clock.innerText = formatTime(gameClock);
}

function formatTime(gameClock) {
    const seconds = Math.floor(gameClock / TPS);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const minLeadingZero = min < 10 ? '0' : '';
    const secLeadingZero = sec < 10 ? '0' : '';
    return minLeadingZero + min + ':' + secLeadingZero + sec;
}

function moveRows(num) {
    for (i = 0; i < rows.length; i++) {
        const row = rows[i];
        const y = (ROW_HEIGHT * i) - ROW_HEIGHT + num;
        row.yPos = y
        row.element.style.top = y;

        if (!row.collided && rowCollision(row)){
            if (charCollision(row)) {
                row.collided = true;

                // Add for letter
                if (LETTERS.includes(row.text)) {
                    removeLetter(row);
                    const block = createStackBlock(row.text);
                    if (needLetter(row.text)) {
                        flashScreen(true);
                        insertLetter(row.text);
                    } else {
                        flashScreen(false);
                    }
                    insertBlock(block);
                    if (wordComplete()) {
                        // Victory!!
                        setGameOverVictory();
                    }
                } else {
                    // Remove if not letter (e.g. ` or .)
                    popBlock(row);
                }
            }
        }
    }
}

function insertBlock(block) {
    blocks.push(block);
    totalBlocks++;
    const slider = document.getElementById('slider');
    slider.insertAdjacentElement('beforeend', block.element);
    stackHeight += BLOCK_HEIGHT;
    if (blocks.length > 9) {
        // You lose
        setGameOver();
    }
}

function insertLetter(letter) {
    const letters = Array.from(document.getElementById('letters').children).map(c => c.children.item(0) ? c.children.item(0).innerText : '');
    let index = word.indexOf(letter); // Index of first occurrence
    while(index < word.length && (word.charAt(index) !== letter || letters[index] === letter)) {
        index++;
    }

    if (index < word.length) {
        const el = document.getElementById('letters').children.item(index);
        const p = document.createElement('p');
        p.classList.add('letter');
        p.innerText = letter;
        el.insertAdjacentElement('afterbegin', p);
    }   
}

function removeLetterFromTop(letter) {
    let index = word.lastIndexOf(letter);
    let el = document.getElementById('letters').children.item(index);
    if (el && el.childElementCount && el.children.item(0) && needLetter(letter)) {
        el.children.item(0).remove();
    }
}
   

function setGameOverVictory() {
    gameOver = true;
    victory = true;
    const h1 = document.getElementById('victory-message');
    const p = document.getElementById('victory-details');
    h1.style.display = 'flex';
    p.innerText = totalBlocks + ' BLOCKS IN ' + formatTime(gameClock);
    document.getElementById('options').style.display = 'flex'

}

function removeLetter(row) {
    row.element.children[row.textIndex].innerText = '';
}

function popBlock(row) {
    if (blocks.length) {
        removeLetter(row);
        stackHeight -= BLOCK_HEIGHT;
        const block = blocks.pop();
        block.element.classList.add('animate__zoomOut');
        setTimeout(() => {
            block.element.remove();
            removeLetterFromTop(block.text);
        }, 250);
    }
}

function rowCollision(row) {
    return !gameOver && (row.yPos >= COLLISION_MIN - stackHeight) && (row.yPos <= COLLISION_MAX - stackHeight); 
}

function charCollision(row) {
    // use row.textIndex and row.hasText
    if (!row.hasText) {
        return false;
    } else {
        const collisionCenter = (COL_WIDTH * row.textIndex) + (COL_WIDTH / 2) - (SLIDER_WIDTH / 2);
        const margin = SLIDER_WIDTH / 3;
        return sliderPos >= (collisionCenter - margin) && sliderPos <= (collisionCenter + margin);
    }
}

function moveSlider(l, r) {
    const slider = document.getElementById('slider');
    const left = sliderPos;
    let newPos = sliderPos;

    if (l) {
        newPos = Math.max(SLIDER_LEFT_MIN, left - SLIDER_MOVE_SPEED);
    }
    if (r) {
        newPos = Math.min(SLIDER_LEFT_MAX, left + SLIDER_MOVE_SPEED);
    }
    if (l || r) {
        slider.style.left = newPos.toString() + 'px';
        sliderPos = newPos;
    }   
}

function createGameRow() {
    const gameScreen = document.getElementById('game-screen');
    const gameRow = document.createElement('div');
    gameRow.className = 'game-row';
    gameRow.id = 'game-row-' + rowCount;

    const rand = Math.floor(Math.random() * 4); // Index of column with text [0-3]
    const randomText = generateChar();

    for (i = 0; i < 4; i++) {
        const gameCol = document.createElement('div');
        gameCol.className = 'game-col';
        gameCol.id = 'game-col-' + i;
        const textToInsert = rand == i ? randomText : "";
        const textElement = generatePElement(textToInsert);
        gameCol.insertAdjacentElement('afterbegin', textElement);
        gameRow.insertAdjacentElement('beforeend', gameCol);
    }

    gameScreen.insertAdjacentElement('afterbegin', gameRow); // Insert element onto screen
    const hasText = randomText != " " && randomText != "";
    const row = {
        element: gameRow,
        hasText,
        text: randomText,
        textIndex: rand,
        yPos: 0,
        collided: false
    };
    rowCount += 1;
    rows.reverse();
    rows.push(row);
    rows.reverse();

    // set game row top to 0
    moveRows(0);
}

function generateChar() {
    const num = Math.random() * 100;
    if (num <= 10) {
        return randomLetterInWord(word);
    } else if (num <= 60) {
        return randomLetter();
    } else {
        return randomFillLetter();
    }
}

function generatePElement(text) {
    const el = document.createElement('p');
    el.innerText = text;
    return el;
}

function randomFillLetter() {
    const rand = Math.floor(Math.random() * 10);
    if (rand  < 3) {
        return '.';
    } else if (rand < 6) {
        return '`';
    } else {
        return ' ';
    }
}

function randomLetterInWord(word) {
    const rand = Math.floor(Math.random() * word.length);
    return word[rand];
}

function randomLetter() {
    const rand = Math.floor(Math.random() * 26);
    return LETTERS[rand];
}

function reset() {
    // set default values
    stopGame();
    gameClock = 0;
    gameOver = false;
    victory = false;
    updateClock(gameClock);
    while (rows.length) {
        const row = rows.pop();
        row.element.remove();
    }
    while (blocks.length) {
        const block = blocks.pop();
        block.element.remove();
    }
    stackHeight = 0;
    gameClock = 0;
    totalBlocks = 0;

    document.getElementById('options').style.display = 'none'
    document.getElementById('victory-message').style.display = 'none'
    document.getElementById('game-over-text').style.display = 'none'
    document.getElementById('victory-details').innerText = ''
    
    // remove letters on top of screen
    const letters = Array.from(document.getElementById('letters').children)
    letters.forEach(letter => letter.children.item(0) ? letter.children.item(0).remove() : null)
}

function restart() {
    reset()
    start()
}

function start() {
    running = true;
    document.getElementById('start-screen').style.display = 'none';
    // const button = document.getElementById('button');
    // button.innerText = 'STOP';
}

function stopGame() {
    running = false;
    // const button = document.getElementById('button');
    // button.innerText = 'START';
}

function toggleGameState() {
    if (running) {
        stopGame();
    } else {
        start();
    }
}

function flashScreen(green) {
    const gameScreen = document.getElementById('game-screen');
    gameScreen.style.backgroundColor = green ? 'green' : 'red';
    setTimeout(() => {
        gameScreen.style.backgroundColor = DEFAULT_SCREEN_COLOR;
    }, 100);
}

function createStackBlock(letter) {
    const p = document.createElement('p');
    const el = document.createElement('div');
    p.className = 'stack-block-text';
    p.innerText = letter;
    el.insertAdjacentElement('afterbegin', p);
    el.className = 'stack-block animate__animated animate__tada';
    el.style.bottom = calculateBlockBottom();
    el.style.backgroundColor = getBlockColor(letter);
    return {
        element: el,
        text: letter
    };
}

function calculateBlockBottom() {
    return 5 + stackHeight;
}

function getBlockColor(letter) {
    if (needLetter(letter)) {
        return GREEN;
    } else {
        return GRAY;
    }
}

function needLetter(letter) {
    // count of letter in stack
    const blockCount = blocks.reduce((prev,curr) => prev + (letter === curr.text ? 1 : 0), 0);
    // count of letter in word
    const wordCount = Array(word.length).fill(0).reduce((p,c,i) => p + (letter === word.charAt(i) ? 1 : 0),0);
    // return if stackCount < wordCount
    return blockCount < wordCount;
}

function wordComplete() {
    const letters = blocks.map(b => b.text)
    let count = 0;

    for (let i = 0; i < word.length; i++) {
        if (letters.includes(word[i])) {
            // remove from letters
            letters.splice(letters.indexOf(word[i]), 1)
            // add to count
            count++
        }
    }

    return count >= word.length;
}

function setGameOver() {
    gameOver = true
    document.getElementById('game-over-text').style.display = 'flex'
    document.getElementById('options').style.display = 'flex'
}

function registerEventListeners() {

    document.getElementById('bottom-bar').addEventListener('touchmove', (ev) => {
        ev.preventDefault();
        const slider = document.getElementById('slider');
        const newLeft = Math.min(Math.max(ev.touches[0].clientX - 35, SLIDER_LEFT_MIN), SLIDER_LEFT_MAX)
        slider.style.left = newLeft;
        sliderPos = newLeft;
    })

    document.addEventListener('keydown', (e) => {
        if (e.code == 'Space') {
            toggleGameState();
        }
        if (e.code == 'KeyA') {
            leftButtonDown = true;
        }
        if (e.code == 'KeyD') {
            rightButtonDown = true;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code == 'KeyA') {
            leftButtonDown = false;
        }
        if (e.code == 'KeyD') {
            rightButtonDown = false;
        }
    });
}