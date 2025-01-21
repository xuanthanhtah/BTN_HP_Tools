document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("imageInput");
  const imagePreviewContainer = document.getElementById(
    "imagePreviewContainer"
  );
  const processButton = document.getElementById("processButton");
  const watermarkSrc = "assets/logo_btn.png"; // Watermark mặc định
  const clearButton = document.getElementById("clearButton");
  const watermarkPreview = document.getElementById("watermarkPreview");
  const watermarkInputButton = document.getElementById("watermarkInputButton");
  const watermarkNote = document.getElementById("watermarkNote");
  const positionSelectWrapper = document.getElementById(
    "positionSelectWrapper"
  );
  const customPositionWrapper = document.getElementById(
    "customPositionWrapper"
  );
  const selectedFiles = new Map();
  const watermarkOptionRadios = document.getElementsByName("watermarkOption");

  let customWatermark = null; // Watermark do người dùng tải lên

  // Tạo input ẩn để tải watermark
  const watermarkInput = document.createElement("input");
  watermarkInput.type = "file";
  watermarkInput.accept = "image/*";
  watermarkInput.style.display = "none";
  document.body.appendChild(watermarkInput);

  // Gắn sự kiện cho nút Clear
  clearButton.addEventListener("click", clearSelectedImages);

  // Gắn sự kiện cho các radio button
  watermarkOptionRadios.forEach((radio) =>
    radio.addEventListener("change", handleWatermarkOptionChange)
  );

  // Gắn sự kiện cho nút tải watermark
  watermarkInputButton.addEventListener("click", () => watermarkInput.click());
  watermarkInput.addEventListener("change", handleWatermarkUpload);

  // Xử lý khi chọn ảnh chính
  fileInput.addEventListener("change", handleFileSelect);

  // Xử lý khi nhấn nút xử lý
  processButton.addEventListener("click", processImages);

  function handleWatermarkOptionChange() {
    const selectedOption = document.querySelector(
      'input[name="watermarkOption"]:checked'
    ).value;

    if (selectedOption === "position") {
      positionSelectWrapper.style.display = "block";
      customPositionWrapper.style.display = "none";
    } else if (selectedOption === "custom") {
      positionSelectWrapper.style.display = "none";
      customPositionWrapper.style.display = "block";
    }
  }

  function handleFileSelect(event) {
    document.getElementById("loading").style.display = "flex";

    const files = event.target.files;
    Array.from(files).forEach((file) => {
      if (!selectedFiles.has(file.name)) {
        selectedFiles.set(file.name, file);
        displayImage(file);
      }
    });

    setTimeout(() => {
      document.getElementById("loading").style.display = "none";
    }, 1000);
  }

  function displayImage(file) {
    const reader = new FileReader();
    const previewElement = document.createElement("div");
    previewElement.className = "image-preview";

    reader.onload = (event) => {
      previewElement.innerHTML = `
              <img src="${event.target.result}" alt="${file.name}">
              <button data-file="${file.name}">&times;</button>
            `;

      previewElement.querySelector("button").addEventListener("click", (e) => {
        const fileName = e.target.dataset.file;
        selectedFiles.delete(fileName);
        previewElement.remove();
      });

      imagePreviewContainer.appendChild(previewElement);
    };

    reader.readAsDataURL(file);
  }

  function clearSelectedImages() {
    selectedFiles.clear();
    imagePreviewContainer.innerHTML = "";
    fileInput.value = "";
  }

  function handleWatermarkUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        watermarkPreview.innerHTML = `
          <div class="watermark-preview-item">
            <img src="${e.target.result}" alt="Watermark">
            <button id="removeWatermarkButton">&times;</button>
          </div>
        `;

        watermarkNote.style.display = "none";

        document
          .getElementById("removeWatermarkButton")
          .addEventListener("click", () => {
            watermarkPreview.innerHTML = "";
            customWatermark = null;
            watermarkInput.value = "";
            watermarkNote.style.display = "block";
          });

        loadImageFromUrl(e.target.result).then((img) => {
          customWatermark = img;
        });
      };
      reader.readAsDataURL(file);
    }
  }

  async function processImages() {
    document.getElementById("loading").style.display = "flex";

    if (selectedFiles.size === 0) {
      alert("Vui lòng chọn ít nhất một hình ảnh!");
      document.getElementById("loading").style.display = "none";
      return;
    }

    const watermarkImg = customWatermark
      ? customWatermark
      : await loadImageFromUrl(watermarkSrc);
    const zip = new JSZip();

    for (let [fileName, file] of selectedFiles) {
      const img = await loadImageFromFile(file);
      const watermarkedImg = addWatermark(img, watermarkImg);
      const dataURL = watermarkedImg.toDataURL("image/jpeg");
      zip.file(fileName, dataURL.split(",")[1], { base64: true });
    }

    zip.generateAsync({ type: "blob" }).then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "watermarked_images.zip";
      link.click();
      document.getElementById("loading").style.display = "none";
    });
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject("Không thể tải watermark.");
      img.src = url;
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      window.loadImage(
        file,
        (img) => {
          if (img.type === "error") {
            reject("Không thể tải ảnh.");
          } else {
            resolve(img);
          }
        },
        { canvas: true, orientation: true }
      );
    });
  }

  function addWatermark(img, watermarkImg) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const position = getWatermarkPosition(img, watermarkImg);

    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      watermarkImg,
      position.x,
      position.y,
      position.width,
      position.height
    );

    return canvas;
  }

  function getWatermarkPosition(img, watermarkImg) {
    const selectedOption = document.querySelector(
      'input[name="watermarkOption"]:checked'
    ).value;

    const watermarkWidth = img.width * 0.2;
    const watermarkHeight =
      (watermarkImg.height / watermarkImg.width) * watermarkWidth;

    if (selectedOption === "custom") {
      const customPosition = document
        .getElementById("customPosition")
        .value.trim();
      const [x, y] = customPosition.split(",").map(Number);
      return {
        x: x || 0,
        y: y || 0,
        width: watermarkWidth,
        height: watermarkHeight,
      };
    }

    let x = 0,
      y = 0;
    const positionSelect = document.getElementById("positionSelect").value;

    switch (positionSelect) {
      case "top-left":
        x = 10;
        y = 10;
        break;
      case "top-right":
        x = img.width - watermarkWidth - 10;
        y = 10;
        break;
      case "bottom-left":
        x = 10;
        y = img.height - watermarkHeight - 10;
        break;
      case "bottom-right":
      default:
        x = img.width - watermarkWidth - 10;
        y = img.height - watermarkHeight - 10;
        break;
    }

    return { x, y, width: watermarkWidth, height: watermarkHeight };
  }
});
