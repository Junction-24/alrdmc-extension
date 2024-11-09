function show_dialog() {
    const dialogContainer = document.createElement('div');
    dialogContainer.innerHTML = dialogHTML;
    // If possible, append the dialog to whatever is after the <article> tag
    const article = document.querySelector('article');
    if (article) {
        console.info("Appending dialog after article");
        article.after(dialogContainer);
    }
    else {
        console.info("Article not found. Appending dialog to body");
        document.body.appendChild(dialogContainer);
    };
}

function hide_dialog() {
    const dialogContainer = document.querySelector('.alrdmc-modal');
    if (dialogContainer) {
        dialogContainer.remove();
    }
}

const dialogHTML = `

<div class="modal-overlay">
    <div class="modal-container">
        <div class="modal-content">
            <p class="statement">
                I think Finland is taking sufficient measures to prepare for extreme climate events
            </p>
            <div class="button-container">
                <button class="button">
                    <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    Agree
                </button>
                <button class="button">
                    <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                    </svg>
                    Disagree
                </button>
            </div>
        </div>
        <div class="footer">
            <a href="#" class="brand">Polis</a>
            <button class="close-button">×</button>
        </div>
    </div>
</div>

`;

const style = document.createElement('style');

// Dialog displayed in the center of the screen
style.textContent = `
.modal-center {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    z-index: 9999;
}
.alrdmc-modal {
    font-family: Arial, sans-serif;
    width: 320px;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 400px;
    width: 90%;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

.modal-content {
    padding: 24px 24px 0;
}

.statement {
    font-size: 16px;
    line-height: 1.4;
    color: #333;
    margin: 0;
    padding-bottom: 24px;
}

.button-container {
    display: flex;
    border-top: 1px solid #eee;
}

.button {
    flex: 1;
    padding: 16px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.button:first-child {
    border-right: 1px solid #eee;
}

.button:hover {
    background-color: #f5f5f5;
}

.button-icon {
    width: 20px;
    height: 20px;
}

.footer {
    padding: 12px 24px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.brand {
    font-weight: bold;
    color: #333;
    text-decoration: none;
    font-size: 14px;
}

.close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #666;
    font-size: 18px;
}

/* Optional overlay background */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
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

.skip {
    background-color: #f0f0f0;
}

.skip:hover {
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
const skipButton = document.getElementById('skipButton');
const dialogContent = document.getElementById('dialogContent');

// Set the dialog content to "Text here"
dialogContent.textContent = "Text here";

// Event listeners for closing the modal
closeButton.addEventListener('click', hide_dialog);