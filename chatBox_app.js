// Selectors
const messageForm = document.querySelector('.prompt__form');
const chatHistoryContainer = document.querySelector('.chats');
const suggestionItems = document.querySelectorAll('.suggests__item');
const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");
const promptInput = document.querySelector(".prompt__form-input");
const sendButton = document.getElementById("sendButton");
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const microButton = document.getElementById('voiceButton');
const imageContainer = document.getElementById('imageContainer');
const showButton = document.getElementById('showimage');
const resizeHandle = document.querySelector('.resize-handle');
const closeButton = document.getElementById('closeButton');
const container = document.querySelector('.container');
const clearHistory = document.getElementById('clearHistory');
const existingImage = document.getElementById('preview')



// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;
const GOOGLE_API_KEY = "AIzaSyCNJlOr5-J3bj37b_iiAfW-mG-WiFa4-bY"; // Thay bằng API key của bạn
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

// Create chat message element
const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
};

// Load and display saved chat history
const loadSavedChatHistory = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("theme-color") === "light_mode";

    if (themeToggleButton) {
        themeToggleButton.innerHTML = isLightTheme ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }
    document.body.classList.toggle("light_mode", isLightTheme);

    chatHistoryContainer.innerHTML = '';

    savedConversations.forEach(conversation => {
        // Tạo và thêm tin nhắn người dùng
        const userMessageHtml = `
        <div class="message__content">
            <i class="fa-solid fa-person-circle-question"></i>
            <p class="message__text">${conversation.userMessage}</p>
        </div>`;
        const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        // Tạo và thêm phản hồi API
        const responseText = conversation.apiResponse;
        const parsedApiResponse = marked.parse(responseText);

        const responseHtml = `
            <div class="message__content">
                <i class="fa-solid fa-robot"></i>
                <p class="message__text">${parsedApiResponse}</p>
            </div>`;
        const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
        chatHistoryContainer.appendChild(incomingMessageElement);

        // Áp dụng highlight cú pháp
        hljs.highlightAll();
    });

    document.body.classList.toggle("hide-header", savedConversations.length > 0);

    // Gọi lại hàm để áp dụng các style cần thiết
    ensureConsistentStyles();
};

// Typing effect for response
const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    if (copyIconElement) {
        copyIconElement.classList.add("hide");
    }

    messageElement.innerHTML = '';

    if (skipEffect) {
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        if (copyIconElement) {
            copyIconElement.classList.remove("hide");
        }
        isGeneratingResponse = false;
        return;
    }

    const wordsArray = rawText.split(' ');
    let wordIndex = 0;
    const typingInterval = setInterval(() => {
        messageElement.innerHTML += (wordIndex === 0 ? '' : ' ') + wordsArray[wordIndex++];
        if (wordIndex === wordsArray.length) {
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            if (copyIconElement) {
                copyIconElement.classList.remove("hide");
            }
        }
    }, 75);
};

// Save conversation
// Định nghĩa hàm saveConversation
const saveConversation = (userMessage, apiResponse) => {
    userMessage = userMessage.trim();

    apiResponse = apiResponse.trim();

    if (userMessage && apiResponse) {
        let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedConversations.push({ userMessage, apiResponse });
        localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));
    }
};



const restoreConversations = () => {
    let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const conversationContainer = document.getElementById('conversation-container');

    savedConversations.forEach(conversation => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('user-message');
        userMessageElement.textContent = `User: ${conversation.userMessage}`;

        const apiResponseElement = document.createElement('div');
        apiResponseElement.classList.add('api-response');
        apiResponseElement.innerHTML = `API Response: ${marked.parse(conversation.apiResponse)}`;

        messageElement.appendChild(userMessageElement);
        messageElement.appendChild(apiResponseElement);

        conversationContainer.appendChild(messageElement);
    });
};

window.addEventListener('load', restoreConversations);

const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: currentUserMessage }
                        ]
                    }
                ]
            }),
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message || "API request failed");

        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!responseText) throw new Error("Invalid API response.");

        const parsedApiResponse = marked.parse(responseText);

        const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        const conversationExists = savedConversations.some(conversation => conversation.apiResponse === responseText);

        if (!conversationExists) {
            saveConversation(currentUserMessage, responseText);
        }

        showTypingEffect(responseText, parsedApiResponse, messageTextElement, incomingMessageElement);

    } catch (error) {
        isGeneratingResponse = false;
        messageTextElement.innerHTML = `Lỗi: ${error.message}`;
        incomingMessageElement.classList.add("message--error");
    } finally {
        incomingMessageElement.classList.remove("message--loading");
    }
};

// Add copy button to code blocks
const addCopyButtonToCodeBlocks = () => {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');
        let language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'Text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class="fa-solid fa-copy"></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.innerHTML = `<i class="fa-solid fa-check"></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class="fa-solid fa-copy"></i>`, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert("Unable to copy text!");
            });
        });
    });
};

// Display loading animation
const displayLoadingAnimation = () => {
    const loadingHtml = `
        <div class="message__content">
            <i class="fa-solid fa-robot"></i>
            <p class="message__text"></p>
            <div class="message__loading-indicator hide">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onclick="copyMessageToClipboard(this)" class="message__icon hide">
            <i class="fa-solid fa-copy"></i>
        </span>`;
    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);

    requestApiResponse(loadingMessageElement);
};

// Copy message to clipboard
const copyMessageToClipboard = (copyButton) => {
    const messageContent = copyButton.parentElement.querySelector('.message__text').innerText;

    navigator.clipboard.writeText(messageContent);
    copyButton.innerHTML = `<i class="fa-solid fa-check"></i>`;
    setTimeout(() => copyButton.innerHTML = `<i class="fa-solid fa-copy"></i>`, 1000);
};


// Event listeners
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        const isLightTheme = document.body.classList.toggle("light_mode");
        localStorage.setItem("theme-color", isLightTheme ? "light_mode" : "dark_mode");

        const newIconClass = isLightTheme ? "fa-solid fa-moon" : "fa-solid fa-sun";
        themeToggleButton.querySelector("i").className = newIconClass;
    });
}

if (clearChatButton) {
    clearChatButton.addEventListener('click', () => {
        if (confirm("Bạn có chắc chắn muốn xóa tất cả lịch sử trò chuyện?")) {
            localStorage.removeItem("saved-api-chats");
            loadSavedChatHistory();
            currentUserMessage = null;
            isGeneratingResponse = false;
        }
    });
}

suggestionItems.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        currentUserMessage = suggestion.querySelector(".suggests__item-text").innerText.trim();
        handleOutgoingMessage();
    });
});

if (messageForm) {
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleOutgoingMessage();
    });
}

// Initialize chat history
// Đảm bảo áp dụng CSS nhất quán
const ensureConsistentStyles = () => {
    document.querySelectorAll('.message__text').forEach(element => {
        element.style.wordWrap = 'break-word'; // Ví dụ về style
        // Thêm các style cần thiết khác
    });
};

// Sự kiện khi tải trang hoàn tất
document.addEventListener("DOMContentLoaded", loadSavedChatHistory());

ensureConsistentStyles();

// Toggle send button visibility
const toggleSendButtonVisibility = () => {
    if (promptInput.value.trim() === "") {
        sendButton.style.display = "none";
    } else {
        sendButton.style.display = "block";
    }
};

// Lắng nghe sự kiện input trên promptInput
promptInput.addEventListener('input', toggleSendButtonVisibility);

// Gọi hàm toggleSendButtonVisibility() khi trang web được tải
document.addEventListener("DOMContentLoaded", function () {
    toggleSendButtonVisibility();
});

// Xử lý hình ảnh
uploadButton.addEventListener('click', () => {
    // Kích hoạt input file khi nhấn nút Upload
    fileInput.click();
});

// Lắng nghe sự kiện khi người dùng chọn tệp ảnh
fileInput.addEventListener('change', () => {
    // Kiểm tra xem người dùng đã chọn ảnh hay chưa
    const imageFile = fileInput.files[0];

    if (imageFile) {
        // Tải ảnh dưới dạng base64 và lưu vào localStorage
        const reader = new FileReader();

        reader.onload = function (event) {
            // Tạo hoặc cập nhật ảnh nếu đã có
            existingImage.src = event.target.result;
            existingImage.style.maxWidth = "100px"; // Giới hạn kích thước ảnh
            existingImage.style.display = "block"; // Hiển thị ảnh

            // Chèn ảnh vào trước ô nhập liệu
            promptInput.parentNode.insertBefore(existingImage, promptInput);
        };

        // Đọc ảnh dưới dạng base64
        reader.readAsDataURL(imageFile);

        // Gọi hàm nhận dạng văn bản từ ảnh nếu cần
        recognizeTextFromImage(imageFile);
    }
});


fileInput.addEventListener('change', (event) => {
    const imageFile = event.target.files[0];  // Lấy file ảnh người dùng chọn

    if (imageFile) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const imageBase64 = e.target.result;  // Lấy ảnh dưới dạng base64

            // Lấy ngày và giờ hiện tại để thêm vào tên ảnh
            const currentDate = new Date();
            const dateTimeString = currentDate.toISOString().replace(/[-T:.Z]/g, '');  // Format dạng: YYYYMMDDHHMMSS

            // Tạo đối tượng ảnh mới với tên ảnh và base64
            const imageData = {
                imageBase64: imageBase64,
                dateTime: dateTimeString
            };

            // Lấy danh sách ảnh đã lưu trong localStorage
            let savedImages = JSON.parse(localStorage.getItem('uploadedImages')) || [];

            // Thêm ảnh mới vào danh sách
            savedImages.push(imageData);

            // Lưu lại danh sách ảnh trong localStorage
            localStorage.setItem('uploadedImages', JSON.stringify(savedImages));

            // Hiển thị tất cả ảnh đã lưu
            displayImages(savedImages);

            // Cập nhật trạng thái
            statusElement.textContent = "Ảnh đã được tải lên và lưu!";
        };

        reader.readAsDataURL(imageFile);  // Chuyển đổi ảnh thành base64
    } else {
        alert("Vui lòng chọn một hình ảnh!");
    }
});

// Hàm hiển thị tất cả các ảnh từ localStorage
const displayImages = (images) => {
    imageContainer.innerHTML = '';  // Xóa tất cả ảnh cũ trong container

    images.forEach((imageData, index) => {
        // Tạo phần tử hình ảnh
        const imgElement = document.createElement('img');
        imgElement.src = imageData.imageBase64;  // Sử dụng base64 của ảnh
        imgElement.classList.add('image-preview');

        // Tạo phần tử để hiển thị ngày giờ
        const dateElement = document.createElement('p');
        dateElement.textContent = `Tải lên lúc: ${formatDateTime(imageData.dateTime)}`;  // Định dạng thời gian

        // Tạo phần tử nút xóa với biểu tượng Font Awesome
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.onclick = () => deleteImage(index);  // Gọi hàm xóa ảnh

        // Thêm biểu tượng trash can vào nút xóa
        const trashIcon = document.createElement('i');
        trashIcon.classList.add('fa-regular', 'fa-trash-can');  // Sử dụng icon trash can của Font Awesome
        deleteButton.appendChild(trashIcon);

        // Thêm ảnh, thời gian và nút xóa vào một wrapper
        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');
        imageWrapper.appendChild(imgElement);
        imageWrapper.appendChild(dateElement);
        imageWrapper.appendChild(deleteButton);

        // Thêm vào container
        imageContainer.appendChild(imageWrapper);
    });
};

// Hàm xóa ảnh
const deleteImage = (index) => {
    // Lấy danh sách ảnh từ localStorage
    let savedImages = JSON.parse(localStorage.getItem('uploadedImages')) || [];

    // Xóa ảnh khỏi mảng theo chỉ số
    savedImages.splice(index, 1);

    // Lưu lại danh sách ảnh đã cập nhật
    localStorage.setItem('uploadedImages', JSON.stringify(savedImages));

    // Hiển thị lại tất cả các ảnh sau khi xóa
    displayImages(savedImages);
};

// Hàm format lại thời gian
const formatDateTime = (dateTimeString) => {
    // Chuyển chuỗi thời gian từ định dạng YYYYMMDDHHMMSS thành đối tượng Date
    const year = dateTimeString.slice(0, 4);
    const month = dateTimeString.slice(4, 6) - 1;  // Tháng bắt đầu từ 0
    const day = dateTimeString.slice(6, 8);
    const hour = dateTimeString.slice(8, 10);
    const minute = dateTimeString.slice(10, 12);
    const second = dateTimeString.slice(12, 14);

    // Tạo đối tượng Date
    const date = new Date(Date.UTC(year, month, day, hour, minute, second));

    // Sử dụng Intl.DateTimeFormat để hiển thị theo múi giờ Việt Nam (GMT+7)
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh',  // Múi giờ Việt Nam
    };

    const formatter = new Intl.DateTimeFormat('vi-VN', options);
    return formatter.format(date);
};

// Khi trang được tải lại, kiểm tra xem có ảnh nào đã được lưu trong localStorage không
window.addEventListener('load', () => {
    const savedImages = JSON.parse(localStorage.getItem('uploadedImages')) || [];
    if (savedImages.length > 0) {
        // Nếu có ảnh, hiển thị tất cả ảnh đã lưu
        displayImages(savedImages);
    }
});



// Hàm nhận diện văn bản từ ảnh
const recognizeTextFromImage = (imageFile) => {
    Tesseract.recognize(
        imageFile,             // Hình ảnh được chọn
        'eng+vie+deu+chi_sim+kor+jpn+fra',                 // Ngôn ngữ (tiếng Anh, bạn có thể thay đổi sang 'vie' cho tiếng Việt)
        {
            logger: (m) => {
                // Cập nhật tiến trình nhận diện qua logger
                if (m.status === 'recognizing text') {
                    statusElement.textContent = `Nhận diện: ${m.progress * 100}%`;
                }
            }
        }
    ).then(({ data: { text } }) => {
        // Điền kết quả nhận diện vào promptInput
        promptInput.value = text.trim(); // Gán văn bản nhận diện vào ô input

        // Đảm bảo rằng sau khi nhận diện, nút gửi sẽ xuất hiện nếu có văn bản trong ô nhập liệu
        toggleSendButtonVisibility();  // Hiển thị lại nút gửi nếu có văn bản

        // Đảm bảo không có hình ảnh bị thừa (nếu có)
        const previewImage = document.querySelector('.uploaded-image');
        if (previewImage) {
            previewImage.remove();  // Xóa ảnh nếu không còn cần thiết
        }
    }).catch((error) => {
        // Xử lý lỗi trong quá trình nhận diện
        console.error("Lỗi nhận diện văn bản:", error);
    });
};

// Ảnh đã tải lên
showButton.addEventListener("click", () => {
    container.style.display = 'block';
    closeButton.style.display = 'block';
    showButton.style.display = 'none';
    clearHistory.style.display = 'block'
})

closeButton.addEventListener("click", () => {
    container.style.display = 'none';
    showButton.style.display = 'block';
    closeButton.style.display = 'none';
    clearHistory.style.display = 'none';
})

clearHistory.addEventListener('click', () => {
    localStorage.removeItem('uploadedImages');
    imageContainer.innerHTML = '';
    alert("Lịch sử ảnh đã được xóa!");
})




// gửi đi tin nhắn


const handleOutgoingMessage = () => {
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;

    if (!currentUserMessage && !file || isGeneratingResponse) return;

    isGeneratingResponse = true;

    // Xử lý tin nhắn văn bản

    const outgoingMessageHtml = `
        <div class="message__content">
            <i class="fa-solid fa-person-circle-question"></i>
            <p class="message__text">${currentUserMessage}</p>
        </div>`;
    const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
    chatHistoryContainer.appendChild(outgoingMessageElement);



    messageForm.reset();
    document.body.classList.add("hide-header");
    setTimeout(displayLoadingAnimation, 500);

    promptInput.value = ''; // Xóa ô nhập sau khi gửi
    sendButton.style.display = "none"; // Ẩn nút gửi
    clearChatButton.style.display = "block";
    if (existingImage) {
        existingImage.remove();
    }

    // Toggle send button visibility after sending message
    toggleSendButtonVisibility();
};

// Xử lý sự kiện nghe giọng nói

let recognition;

if ('webkitSpeechRecognition' in window) {
    // Khởi tạo Web Speech API (SpeechRecognition)
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true; // Cho phép nhận dạng liên tục
    recognition.lang = "vi-VN"; // Ngôn ngữ là tiếng Việt
    recognition.interimResults = true; // Cho phép hiển thị kết quả tạm thời

    recognition.onresult = function (event) {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        promptInput.value = transcript; // Điền kết quả vào ô input

        promptInput.addEventListener('click', function () {
            recognition.stop();  // Dừng nhận diện giọng nói
            sendButton.style.display = 'block';  // Hiển thị nút gửi
            clearChatButton.style.display = 'none';  // Ẩn nút xóa chat
            microButton.disabled = false; // Vô hiệu hóa nút micro trong khi nhận dạng

        });
    };

    // Băt đầu sự kiện nhận giong nói
    microButton.addEventListener('click', function () {
        recognition.start(); // Bắt đầu nhận dạng diện
        console.log("Đang bắt đầu nhận dạng giọng nói...");
        microButton.disabled = true; // Vô hiệu hóa nút micro trong khi nhận dạng
    });

    // Khi bị lỗi
    recognition.onerror = function (event) {
        console.log('Error occurred in recognition: ' + event.error);
    };

    recognition.onend = function () {
        console.log("Nhận dạng giọng nói kết thúc.");
    };
} else {
    alert("Trình duyệt của bạn không hỗ trợ Web Speech API.");
};

// Hành động khi nhấn nút gửi và ngăn chặn phím Enter
promptInput.addEventListener('keydown', (e) => {
    document.addEventListener('keydown', (event) => {
        // Kiểm tra nếu phím nhấn là Enter (keyCode = 13)
        if (event.key === 'Enter') {
            event.preventDefault();  // Ngừng hành động mặc định
            sendButton()
        }
    });
});


resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    // Lưu vị trí ban đầu của chuột
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = imageContainer.offsetWidth;
    const startHeight = imageContainer.offsetHeight;

    // Xử lý sự kiện di chuyển chuột
    const onMouseMove = (moveEvent) => {
        if (isResizing) {
            const dy = startY - moveEvent.clientY;  // Sự thay đổi theo chiều dọc (ngược lại)

            // Cập nhật kích thước của phần tử
            imageContainer.style.height = startHeight + dy + 'px';
            imageContainer.style.top = resizable.offsetTop + dy + 'px';  // Di chuyển phần tử lên khi kéo
        }
    };

    // Dừng việc kéo khi thả chuột
    const onMouseUp = () => {
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    // Thêm sự kiện di chuyển chuột và thả chuột
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});


particlesJS('particles-js', {
    particles: {
        number: {
            value: 100
        },
        size: {
            value: 3
        }
    }
});

let A = 0, B = 0; // Rotation angles
let x, y, z;
let ooz;
let xp, yp;
let idx;
const K1 = 40;              // Magnification factor
const distanceFromCam = 100; // Camera distance
const cubeWidth = 20;       // Cube size
const width = 160, height = 44; // Screen size
let zBuffer = new Array(width * height).fill(0);
let buffer = new Array(width * height).fill(' '); // Background character
const incrementSpeed = 0.6; // Speed of increment

// Calculate X coordinate based on rotation angles and cube position
function calculateX(i, j, k) {
    return j * Math.sin(A) * Math.sin(B) * Math.cos(0) - k * Math.cos(A) * Math.sin(B) * Math.cos(0) +
        j * Math.cos(A) * Math.sin(0) + k * Math.sin(A) * Math.sin(0) + i * Math.cos(B) * Math.cos(0);
}

// Calculate Y coordinate based on rotation angles and cube position
function calculateY(i, j, k) {
    return j * Math.cos(A) * Math.cos(0) + k * Math.sin(A) * Math.cos(0) -
        j * Math.sin(A) * Math.sin(B) * Math.sin(0) + k * Math.cos(A) * Math.sin(B) * Math.sin(0) -
        i * Math.cos(B) * Math.sin(0);
}

// Calculate Z coordinate based on rotation angles and cube position
function calculateZ(i, j, k) {
    return k * Math.cos(A) * Math.cos(B) - j * Math.sin(A) * Math.cos(B) + i * Math.sin(B);
}

// Function to calculate for a surface and project it to the screen
function calculateForSurface(cubeX, cubeY, cubeZ, ch) {
    x = calculateX(cubeX, cubeY, cubeZ);
    y = calculateY(cubeX, cubeY, cubeZ);
    z = calculateZ(cubeX, cubeY, cubeZ) + distanceFromCam;

    ooz = 1 / z; // Depth calculation

    xp = Math.floor(width / 2 - 2 * cubeWidth + K1 * ooz * x * 2);
    yp = Math.floor(height / 2 - K1 * ooz * y); // Note: subtracting y to avoid inverted image
    idx = xp + yp * width;

    if (idx >= 0 && idx < width * height) {
        if (ooz > zBuffer[idx]) { // Depth check
            zBuffer[idx] = ooz;
            buffer[idx] = ch;
        }
    }
}

// Main rendering loop
function renderLoop() {
    // Reset buffers
    buffer.fill(' ');
    zBuffer.fill(0);

    // Loop to calculate and draw each point of the cube's surface
    for (let cubeX = -cubeWidth; cubeX < cubeWidth; cubeX += incrementSpeed) {
        for (let cubeY = -cubeWidth; cubeY < cubeWidth; cubeY += incrementSpeed) {
            calculateForSurface(cubeX, cubeY, -cubeWidth, '.');
            calculateForSurface(cubeWidth, cubeY, cubeX, '$');
            calculateForSurface(-cubeWidth, cubeY, -cubeX, '~');
            calculateForSurface(-cubeX, cubeY, cubeWidth, '#');
            calculateForSurface(-cubeX, -cubeWidth, -cubeY, ';');
            calculateForSurface(cubeX, cubeWidth, cubeY, '+');
        }
    }

    // Output the buffer to the webpage
    document.getElementById('output').textContent = buffer.reduce((output, char, index) => {
        return output + (index % width === 0 && index !== 0 ? '\n' : '') + char;
    }, '');

    A += 0.05; // Increment angle A
    B += 0.05; // Increment angle B

    // Call renderLoop again for continuous animation
    setTimeout(renderLoop, 1000 / 60); // 60 FPS
}

// Start the rendering loop when the page loads
window.onload = function () {
    renderLoop();
};