const dialogHTML = `
    <div class="dialog">
        <h1>You can take action!</h1>
        <div class="image-list">
            <img src="image1.jpg" alt="Image 1">
            <img src="image2.jpg" alt="Image 2">
            <img src="image3.jpg" alt="Image 3">
        </div>
    </div>
`;

const style = document.createElement('style');
style.textContent = `
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
    }
    .dialog {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        text-align: center;
    }
    .dialog h1 {
        margin-bottom: 20px;
    }
    .image-list {
        display: flex;
        justify-content: center;
        gap: 10px;
    }
    .image-list img {
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 8px;
    }
`;

document.head.appendChild(style);

const dialogContainer = document.createElement('div');
dialogContainer.innerHTML = dialogHTML;
document.body.appendChild(dialogContainer);