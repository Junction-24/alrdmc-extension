function show_dialog() {
    const dialogContainer = document.createElement('div');
    dialogContainer.innerHTML = dialogHTML;
    document.body.appendChild(dialogContainer);
}

function hide_dialog() {
    const dialogContainer = document.querySelector('.alrdmc-modal');
    if (dialogContainer) {
        dialogContainer.remove();
    }
}

const dialogHTML = `<div class="alrdmc-modal">
        <div class="alrdmc-modal-header">
            <span class="alrdmc-modal-title">Polis</span>
            <button class="close-button" id="closeButton">✕</button>
        </div>
        <div class="alrdmc-modal-content">
            <p>I think Finland is taking sufficient measures to prepare for extreme climate events</p>
        </div>
        <div class="alrdmc-modal-footer">
            <button class="button agree">👍 Agree</button>
            <span class="divider"></span>
            <button class="button disagree">👎 Disagree</button>
        </div>
    </div>
`;

const style = document.createElement('style');

// Dialog displayed in the center of the screen
style.textContent = `
   .alrdmc-modal {
    width: 320px;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.alrdmc-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background-color: #f8f8f8;
}

.alrdmc-modal-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #999;
}

.alrdmc-modal-content {
    padding: 16px;
    font-size: 15px;
    color: #333;
}

.alrdmc-modal-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 16px;
    border-top: 1px solid #e0e0e0;
    background-color: #f8f8f8;
}

.button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
}

.agree {
    background-color: #f0f0f0;
}

.agree:hover {
    background-color: #e0e0e0;
}

.disagree {
    background-color: #f0f0f0;
}

.disagree:hover {
    background-color: #e0e0e0;
}

.divider {
    width: 1px;
    height: 24px;
    background-color: #ddd;
    margin: 0 8px;
}
`;

document.head.appendChild(style);

show_dialog();

const closeButton = document.getElementById('closeButton');
const agreeButton = document.getElementById('agreeButton');
const disagreeButton = document.getElementById('disagreeButton');

// Event listeners for closing the modal
closeButton.addEventListener('click', hide_dialog);