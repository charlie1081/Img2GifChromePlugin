// Localization helper function
function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

// 監聽 DOM 變化，檢查發文彈窗是否出現
const observer = new MutationObserver(() => {
  injectButton();
});

let gifWorkerScriptUrlPromise;

function getGifWorkerScriptUrl() {
  if (gifWorkerScriptUrlPromise) return gifWorkerScriptUrlPromise;

  gifWorkerScriptUrlPromise = fetch(chrome.runtime.getURL('vendor/gif.worker.js'))
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load gif.worker.js: ${res.status}`);
      return res.text();
    })
    .then((code) => {
      const blob = new Blob([code], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
    });

  return gifWorkerScriptUrlPromise;
}

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 初始化時執行一次
setTimeout(injectButton, 500);

function injectButton() {
  // 查找發佈按鈕 - 支援兩種類型
  const tweetButtons = document.querySelectorAll('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  
  tweetButtons.forEach((tweetButton) => {
    // 檢查是否已經注入過按鈕
    const buttonWrapper = tweetButton.parentElement;
    if (buttonWrapper.querySelector('.image-to-gif-btn')) {
      return;
    }
    
    console.log(getMessage('foundTweetButton'));
    addGifButtonNextToTweetButton(tweetButton);
  });
}

function addGifButtonNextToTweetButton(tweetButton) {
  // 創建 GIF 按鈕容器
  const gifButton = document.createElement('button');
  gifButton.className = 'image-to-gif-btn css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-1cwvpvk r-2yi16 r-1qi8awa r-3pj75a r-o7ynqc r-6416eg r-1ny4l3l';
  gifButton.title = getMessage('convertImageToGif');
  gifButton.type = 'button';
  gifButton.setAttribute('aria-label', getMessage('convertImageToGif'));
  gifButton.style.backgroundColor = 'rgb(239, 243, 244)';
  gifButton.style.borderColor = 'rgba(0, 0, 0, 0)';
  gifButton.style.marginLeft = '12px';
  gifButton.style.padding = '4px 8px';
  gifButton.style.display = 'flex';
  gifButton.style.alignItems = 'center';
  gifButton.style.justifyContent = 'center';
  gifButton.style.borderRadius = '20px';
  gifButton.style.cursor = 'pointer';
  gifButton.style.transition = 'background-color 0.2s';
  
  // 添加懸停效果
  gifButton.addEventListener('mouseenter', () => {
    gifButton.style.backgroundColor = 'rgb(229, 233, 234)';
  });
  gifButton.addEventListener('mouseleave', () => {
    gifButton.style.backgroundColor = 'rgb(239, 243, 244)';
  });
  
  // 創建 SVG 圖標
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.color = 'rgb(15, 20, 25)';
  svg.style.width = '30px';
  svg.style.height = '30px';
  
  svg.innerHTML = `
    <g>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
      <text x="12" y="15" font-size="8" font-weight="bold" text-anchor="middle" fill="currentColor">GIF</text>
    </g>
  `;
  
  gifButton.appendChild(svg);
  
  // 添加點擊事件
  gifButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openImagePicker();
  });
  
  // 在發佈按鈕前插入 GIF 按鈕
  tweetButton.parentElement.insertBefore(gifButton, tweetButton);
  console.log(getMessage('gifButtonAdded'));
}

function openImagePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      convertToGif(files);
    }
  });
  
  input.click();
}

function convertToGif(files) {
  // 支援的圖片格式
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (typeof GIF === 'undefined') {
    showNotification(getMessage('gifConverterNotLoaded'));
    return;
  }

  files.forEach((file, index) => {
    const fileType = (file.type || '').toLowerCase();
    if (!supportedFormats.includes(fileType)) {
      showNotification(getMessage('unsupportedFormat', file.name));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const blob = new Blob([e.target.result], { type: file.type || 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          let canvas;
          let ctx;

          try {
            canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx = canvas.getContext('2d', { willReadFrequently: true });
            // 設定背景色以處理透明圖片
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          } catch (error) {
            console.error('Conversion error:', error);
            showNotification(getMessage('conversionFailed', error.message));
            URL.revokeObjectURL(url);
            return;
          }

          URL.revokeObjectURL(url);

          getGifWorkerScriptUrl()
            .then((workerScriptUrl) => {
              const gif = new GIF({
                workers: 2,
                quality: 10,
                repeat: 0,
                workerScript: workerScriptUrl,
                width: canvas.width,
                height: canvas.height
              });

              // 用兩個相同 frame，讓 Twitter 以「動畫 GIF」顯示 GIF 標籤
              gif.addFrame(ctx, { copy: true, delay: 200 });
              gif.addFrame(ctx, { copy: true, delay: 200 });

              gif.on('finished', (gifBlob) => {
                const gifName = file.name.replace(/\.[^/.]+$/, '') + '.gif';
                uploadToTwitter(gifBlob, gifName);
                showNotification(getMessage('imageConverted', (index + 1).toString()));
              });

              gif.on('abort', () => {
                showNotification(getMessage('conversionAborted'));
              });

              gif.render();
            })
            .catch((err) => {
              console.error('Failed to load GIF worker:', err);
              showNotification(getMessage('conversionFailed', err.message));
            });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          showNotification(getMessage('imageNotLoaded', (index + 1).toString()));
        };

        img.src = url;
      } catch (error) {
        showNotification(getMessage('conversionFailed', error.message));
      }
    };

    reader.onerror = () => {
      showNotification(getMessage('fileReadError', file.name));
    };

    reader.readAsArrayBuffer(file);
  });
}

function uploadToTwitter(blob, fileName) {
  // 找到推特的檔案輸入元素
  const fileInput = document.querySelector('[data-testid="fileInput"]');
  
  if (!fileInput) {
    showNotification(getMessage('fileInputNotFound'));
    return;
  }
  
  // 創建 DataTransfer 物件來模擬檔案選擇
  const dataTransfer = new DataTransfer();
  const file = new File([blob], fileName, { type: 'image/gif' });
  dataTransfer.items.add(file);
  
  // 設定檔案輸入的 files
  fileInput.files = dataTransfer.files;
  
  // 觸發 change 事件
  const event = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(event);
  
  console.log(`✓ Image uploaded to Twitter: ${fileName}`);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'image-to-gif-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}
